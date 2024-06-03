const mongoose = require("mongoose");
const prisonerSchema = mongoose.Schema;
const adminSchema = mongoose.Schema;

const prisoner = new prisonerSchema(
  {
    name: {
      type: String,
      required: true,
    },
    dateOfImprisonment: {
      type: String,
      required: true,
    },
    authorizedLocations: [
      [
        {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
      ],
    ],
    currentLocations: [
      {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    ],
    deviceId: {
      type: String,
      required: true,
    },
    alerts: [
      {
        type: String,
        timestamps: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const admin = new adminSchema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    prisoners: [prisoner],
  },
  {
    timestamps: true,
  }
);

const Prisoner = mongoose.model("Prisoner", prisoner);
const Admin = mongoose.model("Admin", admin);

module.exports = { Prisoner, Admin };
