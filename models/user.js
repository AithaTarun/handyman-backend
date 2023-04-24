const mongoose = require('mongoose');

const uniqueValidator = require('mongoose-unique-validator');
const {Schema} = require("mongoose");

const userSchema = new mongoose.Schema
(
  {
    role:
      {
        type: Schema.Types.String,
        enum: ['admin', 'handyman', 'customer'],
        required: true
      },

    username:
      {
        type: Schema.Types.String,
        required: true
      },

    password:
      {
        type: Schema.Types.String,
        required: true
      },

    first_name:
      {
        type: Schema.Types.String,
        required: true
      },

    last_name:
      {
        type: Schema.Types.String,
        required: true
      },

    email:
      {
        type: Schema.Types.String,
        required: true,
        unique: true
      },

    phone:
      {
        type: Schema.Types.String,
        required: true,
        unique: true
      },

    address:
      {
        type:
          {
            locality:
              {
                type: Schema.Types.String,
                required: true
              },

            landmark:
              {
                type: Schema.Types.String
              },

            pin_code:
              {
                type: Schema.Types.Number,
                required: true
              },

            city_district_town:
              {
                type: Schema.Types.String,
                required: true
              },

            state:
              {
                type: Schema.Types.String,
                required: true
              },

            address_line:
              {
                type: Schema.Types.String,
                required: true
              }
          },
        required: true
      },

    verified:
      {
        type: Schema.Types.Boolean,
        required: true,
        default: false
      }
  }
);

userSchema.index({"username": 1, "role": 1}, {unique: true}); // Making combination of role and username unique

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model
(
  'User',
  userSchema
);
