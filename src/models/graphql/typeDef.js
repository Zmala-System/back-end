const { gql } = require("apollo-server");

module.exports = gql`
  type Prisoner {
    id: ID!
    name: String!
    dateOfImprisonment: String!
    authorizedLocations: [[Location]]
    currentLocations: [Location]
    deviceId: String!
    alerts: [String!]
    battery: String
  }

  type Admin {
    id: ID!
    username: String!
    email: String!
    password: String!
    token: String!
    prisoners: [Prisoner!]
  }

  type AuthData {
    userId: ID!
    username: String!
    token: String!
    tokenExpiration: Int!
  }

  type Query {
    getPrisonerByDeviceIdnassim(deviceId: String!): Prisoner
    getPrisonerByDeviceId(Username: String!): Prisoner
    getPrisoners: [Prisoner!]
  }

  type Mutation {
    createPrisoner(prisonerInput: PrisonerInput!): Prisoner!
    deletePrisoner(deviceId: String!): Prisoner!
    registerAdmin(registerAdminInput: RegisterAdminInput!): AuthData!
    loginAdmin(loginAdminInput: LoginAdminInput!): AuthData!
    changeAdminPassword(password: String!, confirmPassword: String!): Admin!
    addPrisonerLocation(
      deviceId: String!
      authorizedLocations: [[LocationInput]]
    ): Prisoner!
    updatePrisonerInfo(
      DeviceId: String!
      prisonerInput: PrisonerInput!
    ): Prisoner!
  }
  type Subscription {
    locationChangedPrisoner(deviceId: String!) : String
  }

  input PrisonerInput {
    name: String!
    dateOfImprisonment: String!
    authorizedLocations: [[LocationInput]]
    deviceId: String!
  }

  input RegisterAdminInput {
    username: String!
    email: String!
    password: String!
    confirmPassword: String!
  }

  input LoginAdminInput {
    email: String!
    password: String!
  }

  input LocationInput {
    latitude: Float
    longitude: Float
  }

  type Location {
    latitude: Float
    longitude: Float
  }
  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }
`;
