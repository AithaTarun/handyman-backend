const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const userProfileSchema = new mongoose.Schema
(
  {
    userID:
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },

    avatar:
      {
        type:
          {
            id: Schema.Types.String,
            url: Schema.Types.String
          },
      },

    aadhaarCard:
      {
        type:
          {
            id: Schema.Types.String,
            url: Schema.Types.String
          },
      },

    panCard:
      {
        type:
          {
            id: Schema.Types.String,
            url: Schema.Types.String
          },
      },

    skillCertificates:
      {
        type:
          {
            id: Schema.Types.String,
            url: Schema.Types.String
          },
      },

    previousEmployerDocuments:
      {
        type:
          {
            id: Schema.Types.String,
            url: Schema.Types.String
          },
      },

    driveFolderID:
      {
        type: Schema.Types.String
      },

    skills:
      {
        type: [Schema.Types.String],
        default : []
      },

    verified:
      {
        type: Schema.Types.Boolean,
        required: true,
        default: false
      },
  }
);

module.exports = mongoose.model
(
  'UserProfile',
  userProfileSchema
);
