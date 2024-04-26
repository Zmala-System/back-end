const { gql } = require('apollo-server');

module.exports = gql`

            type Prisoner {
                id: ID!
                name: String!
                dateOfImprisonment: String!
                authorizedLocations: [[Location]]
                deviceId: String!
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
                token: String!
                tokenExpiration: Int!
            }

            type Query {
                getPrisonerByDeviceId(Username:String!): Prisoner
                getPrisoners: [Prisoner!]
            }

            type Mutation {
                createPrisoner(prisonerInput: PrisonerInput!): Prisoner!
                deletePrisoner(deviceId: String!): Prisoner!
                registerAdmin(registerAdminInput: RegisterAdminInput!): AuthData!
                loginAdmin(loginAdminInput: LoginAdminInput!): AuthData!
                addPrisonerLocation(Username: String!, authorizedLocations: [[LocationInput]]): Prisoner!
                isInAuthorizedLocation(currentPoint: LocationInput!,  Username: String!): Boolean!
                updatePrisonerInfo(prisonerInput: PrisonerInput!): Prisoner!
            }
       
            input PrisonerInput  {
                name: String!
                dateOfImprisonment: String!
                authorizedLocations: [[LocationInput]]
                currentLocations: [LocationInput]
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

`