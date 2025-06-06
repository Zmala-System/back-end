const { Prisoner, Admin } = require("../Prisoners.js");
const { ApolloError, AuthenticationError } = require("apollo-server-errors");
const geolib = require("geolib");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isEmpty } = require("lodash");
const { pubsub } = require("../../utils/pubsub.js");

module.exports = {
  Query: {
   getPrisonerByDeviceIdnassim: async (_, { deviceId }, { req }) => {

     try {

      const foundPrisoner = await Prisoner.findOne({ deviceId: deviceId }).exec();
          
        if (!foundPrisoner) {
          throw new Error(`Prisoner with name '${deviceId}' not found.`);
        }

        return foundPrisoner;
      } 
      catch (error) {
        console.error("Error retrieving prisoner by deviceId:", error);
        throw new Error(
          "Failed to retrieve prisoner by deviceId. Please check your input."
        );
      }
    },
    getPrisonerByDeviceId: async (_, { deviceId }, { req }) => {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const admin = await Admin.findById(req.userId).exec();

        if (!admin) {
          throw new Error("Admin not found");
        }

        const Prisoners = admin.prisoners;
        const foundPrisoner = admin.prisoners.find(
          (prisoner) => prisoner.deviceId === deviceId
        );

        if (!foundPrisoner) {
          throw new Error(`Prisoner with name '${deviceId}' not found.`);
        }

        console.log(`Prisoner found: ${foundPrisoner}`);
        return foundPrisoner;
      } catch (error) {
        console.error("Error retrieving prisoner by name:", error);
        throw new Error(
          "Failed to retrieve prisoner by name. Please check your input."
        );
      }
    },

    getPrisoners: async (_, args, { req }) => {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }
      try {
        const admin = await Admin.findById(req.userId).exec();
        
        if (!admin) {
          throw new Error("Admin not found");
        }

        const Prisoners = admin.prisoners;

        return Prisoners;
      } catch (error) {
        console.error(error);
        throw new Error("Failed to retrieve prisoners");
      }
    },
  },

  Mutation: {
    async createPrisoner(
      _,
      {
        prisonerInput: {
          name,
          dateOfImprisonment,
          authorizedLocations,
          deviceId,
        },
      },
      { req }
    ) {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const foundPrisoner = await Prisoner.findOne({
          deviceId: deviceId,
        }).exec();

        if (foundPrisoner) {
          throw new Error(
            `A prisoner device id "${deviceId}" already exists in the database.`
          );
        }

        const prisoner = {
          name: name,
          dateOfImprisonment: dateOfImprisonment,
          deviceId: deviceId,
          adminId: req.userId,
        };

        const newPrisoner = new Prisoner(prisoner);
        newPrisoner.authorizedLocations.push(...authorizedLocations);
        const res = await newPrisoner.save();
        const existingAdmin = await Admin.findById(req.userId).exec();
        existingAdmin.prisoners.push(res);
        await existingAdmin.save();
        return res;
      } catch (error) {
        console.error("Token verification failed:", error.message);
        throw new AuthenticationError("Authentication failed.");
      }
    },
    async updatePrisonerInfo(
      _,
      {
        DeviceId,
        prisonerInput: {
          name,
          dateOfImprisonment,
          authorizedLocations,
          deviceId,
        },
      },
      { req }
    ) {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const admin = await Admin.findById(req.userId).exec();

        if (!admin) {
          throw new Error("Admin not found");
        }

        const prisonerIndex = admin.prisoners.findIndex(
          (prisoner) => prisoner.deviceId == DeviceId
        );

        if (prisonerIndex == -1) {
          throw new Error("Prisoner not found");
        }

        const prisoner = await Prisoner.findOne({ deviceId: DeviceId });

        const prisonerToUpdate = admin.prisoners[prisonerIndex];

        if (name !== "") {
          prisonerToUpdate.name = name;
          prisoner.name = name;
        }

        if (dateOfImprisonment !== "") {
          prisonerToUpdate.dateOfImprisonment = dateOfImprisonment;
          prisoner.dateOfImprisonment = dateOfImprisonment;
        }

        if (!isEmpty(authorizedLocations)) {
          prisonerToUpdate.authorizedLocations = authorizedLocations;
          prisoner.authorizedLocations = authorizedLocations;
        }

        if (deviceId !== "") {
          prisonerToUpdate.deviceId = deviceId;
          prisoner.deviceId = deviceId;
        }

        await prisoner.save();
        await admin.save();
        return prisoner;
      } catch (error) {
        console.error("Token verification failed:", error.message);
        throw new AuthenticationError("Authentication failed.");
      }
    },

    async addPrisonerLocation(_, { deviceId, authorizedLocations }, { req }) {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const admin = await Admin.findById(req.userId).exec();

        if (!admin) {
          throw new Error("Admin not found");
        }

        const foundPrisoner = admin.prisoners.find(
          (prisoner) => prisoner.deviceId === deviceId
        );

        if (!foundPrisoner) {
          throw new Error(`Prisoner with device id '${deviceId}' not found.`);
        }

        foundPrisoner.authorizedLocations.push(...authorizedLocations);
        await admin.save();

        const prisoner = await Prisoner.findOne({ deviceId: deviceId });
        prisoner.authorizedLocations.push(...authorizedLocations);

        const res = await prisoner.save();
        return res;
      } catch (error) {
        console.error("Token verification failed:", error.message);
        throw new AuthenticationError("Authentication failed.");
      }
    },

    async deletePrisoner(_, { deviceId }, { req }) {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const admin = await Admin.findById(req.userId).exec();

        if (!admin) {
          throw new Error("Admin not found");
        }

        const foundPrisonerIndex = admin.prisoners.findIndex(
          (prisoner) => prisoner.deviceId === deviceId
        );

        if (foundPrisonerIndex === -1) {
          throw new Error(`Prisoner with device id '${deviceId}' not found.`);
        }

        admin.prisoners.splice(foundPrisonerIndex, 1);
        await admin.save();

        const deletedPrisoner = await Prisoner.findOneAndDelete({
          deviceId: deviceId,
        }).exec();

        return deletedPrisoner;
      } catch (error) {
        console.error("Token verification failed:", error.message);
        throw new AuthenticationError("Authentication failed.");
      }
    },

    async registerAdmin(
      _,
      { registerAdminInput: { username, email, password, confirmPassword } }
    ) {
      const oldAdminByEmail = await Admin.findOne({ email: email }).exec();
      const oldAdminByUsername = await Admin.findOne({
        username: username,
      }).exec();

      if (oldAdminByEmail || oldAdminByUsername) {
        throw new ApolloError(`Admin already registered`);
      }

      if (password !== confirmPassword) {
        throw new ApolloError(`Passwords do not match!`);
      }

      var encryptedPassword = await bcrypt.hashSync(password, 10);

      const admin = {
        username: username,
        email: email.toLowerCase(),
        password: encryptedPassword,
      };

      const newAdmin = new Admin(admin);

      const token = jwt.sign(
        {
          admin_id: newAdmin._id,
          email,
        },
        "UNSAFE_STRING",
        {
          expiresIn: "2h",
        }
      );

      newAdmin.token = token;
      const res = await newAdmin.save();

      if (!res) {
        throw new Error("Admin not created successfully");
      }

      return {
        userId: newAdmin.id,
        token: token,
        tokenExpiration: 2,
      };
    },
    async changeAdminPassword(_, { password, confirmPassword }, { req }) {
      if (!req.isAuth) {
        throw new AuthenticationError("Not authenticated");
      }

      try {
        const admin = await Admin.findById(req.userId).exec();

        if (!admin) {
          throw new Error("Admin not found");
        }

        if (password !== confirmPassword) {
          throw new ApolloError(`Passwords do not match!`);
        }

        const encryptedPassword = await bcrypt.hashSync(password, 10);

        admin.password = encryptedPassword;
        await admin.save();

        return admin;
      } catch (error) {
        console.error("Token verification failed:", error.message);
        throw new AuthenticationError("Authentication failed.");
      }
    },

    async loginAdmin(_, { loginAdminInput: { email, password } }) {
      const existingAdmin = await Admin.findOne({ email: email }).exec();

      if (
        existingAdmin &&
        (await bcrypt.compare(password, existingAdmin.password))
      ) {
        const token = jwt.sign(
          {
            userId: existingAdmin._id,
            email,
          },
          "UNSAFE_STRING",
          {
            expiresIn: "2h",
          }
        );

        existingAdmin.token = token;
        const res = await existingAdmin.save();

        if (!res) {
          throw new Error("Admin not logged in successfuly");
        }

        return {
          userId: existingAdmin.id,
          username:existingAdmin.username,
          token: token,
          tokenExpiration: 2,
        };
      } else {
        throw new ApolloError("Incorrect password", "INCORRECT_PASSWORD");
      }
    },
  },
  Subscription: {
    locationChangedPrisoner: {
            subscribe: async () => {
              const channel = `locationChangedPrisoner_`;
              return pubsub.asyncIterator(channel);
            },
            resolve: (payload) => {
              return payload.message;
            },
        },
  },
};
