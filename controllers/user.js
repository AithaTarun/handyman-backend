const User = require('../models/user');
const Otp = require('../models/otp');

const bcrypt = require('bcrypt');

const jsonwebtoken = require('jsonwebtoken');

const nodemailer = require('nodemailer');
const {dirname} = require("path");

const Email = require('email-templates');

const UserProfile = require('../models/userProfile');

exports.createUser = async (request, response, next) =>
{
  try
  {
    const hashedPassword = await bcrypt.hash(request.body.password, 10);

    const address =
      {
        locality: request.body.locality,
        landmark: request.body.landmark || '',
        pin_code: request.body.pin_code,
        city_district_town: request.body.city_district_town,
        state: request.body.state,
        address_line: request.body.address_line
      };

    const user = new User
    (
      {
        role: request.body.role,
        username : request.body.username,
        password : hashedPassword,
        first_name : request.body.first_name,
        last_name : request.body.last_name,
        email: request.body.email,
        phone: request.body.phone,
        address: address
      }
    );

    const result = await user.save();

    const otpResult = await sendAccountActivationMail(request.body.email, result._id);
    console.log("Result : ", otpResult);

    return response.status(201).send
    (
      {
        status: true,
        message : 'User created',
        result :
          {
            id : result._id,
            username : result.username,
          }
      }
    );
  }
  catch (error)
  {
    console.log("Error while creating user : ", error);

    let errorMessages = [];

    Object.entries(error.errors)
      .map(
        err =>
        {
          console.log(err[0]);
          errorMessages.push(err[0])
        }
      );

    return response.status(500).send
    (
      {
        status: false,
        message : errorMessages
      }
    );
  }
};

exports.resendOTP = async (request, response, next)=>
{
  try
  {
    const user = await User.findOne
    (
      {
        username: request.body.username,
        role: request.body.role
      }
    );

    if (user)
    {
      const otpResult = await sendAccountActivationMail(user.email, user._id);

      if (otpResult.toString() === "-1")
      {
        return response.status(400).send({status: false, message: "Error while resending OTP"});
      }
      else
      {
        return response.status(200).send({status: false, message: "Resent OTP Successfully"});
      }
    }
    else
    {
      console.log("User not found");
      return response.status(400).send({status: false, message: "User not found"});
    }
  }
  catch (error)
  {
    console.log("Error while resending OTP : ", error);
    return response.status(400).send({status: false, message: error.message});
  }
}

sendAccountActivationMail = async (toMail, userID) =>
{
  try
  {
    const appDir = dirname(require.main.filename);

    const transporter = nodemailer.createTransport
    (
      {
        service: 'gmail',

        auth:
          {
            user: process.env.MAIL_ID,
            pass: process.env.MAIL_PASSWORD
          }
      }
    );

    const email = new Email();

    const otpCode =  Math.floor(Math.random() * (9999 - 1000 + 1) + 1000);

    const otpRecord =
      {
        otp: otpCode,
        userID: userID
      };

    await Otp.findOneAndUpdate({userID: userID}, otpRecord, {upsert: true});

    const html = await email.render
    (
      appDir + '/backend/views/otpVerification.ejs', {otpCode: otpCode}
    );

    const mainOptions =
      {
        from: process.env.MAIL_ID,
        to: toMail,
        subject: 'Handyman OTP Verification',
        html: html
      };

    const result = await transporter.sendMail(mainOptions);

    console.log("Mail status : ", result);

    return 1;
  }
  catch (error)
  {
    console.log("Error while sending OTP : ", error);

    return -1;
  }
}

exports.verifyUser = async (request, response, next) =>
{
  try
  {
    const user = await User.findOne
    (
      {
        username: request.body.username,
        role: request.body.role
      }
    );

    if (user)
    {
      const otpResult = await Otp.findOne
      (
        {
          userID: user._id
        }
      );

      if (otpResult)
      {
        if (otpResult.otp.toString() === request.body.otp.toString())
        {
          const updateResult = await User.updateOne
          (
            {
              _id: otpResult.userID
            },
            {
              verified: true
            }
          );

          if (updateResult)
          {
            console.log("Verified user successfully");

            await Otp.deleteOne
            (
              {
                _id: otpResult._id
              }
            );

            const userProfile = new UserProfile({userID: user._id});
            const profileCreationResult = await userProfile.save();

            return response.status(200).send({status: true, message: "Verified user successfully"});
          }
        }
        else
        {
          console.log("Incorrect OTP");
          return response.status(400).send({status: false, message: "Incorrect OTP"});
        }
      }
      else
      {
        console.log("Invalid OTP");
        return response.status(400).send({status: false, message: "Invalid OTP"});
      }
    }
    else
    {
      console.log("User not found");
      return response.status(400).send({status: false, message: "User not found"});
    }
  }
  catch (error)
  {
    console.log("Error while verifying user : ", error);
    return response.status(400).send({status: false, message: error.message});
  }
}

exports.loginUser = async (request, response, next) =>
{
  try
  {
    const user = await User.findOne
    (
      {
        role: request.body.role,
        username: request.body.username
      }
    );

    if (user) // Found user
    {
      // Validate password
      const passwordResult = await bcrypt.compare(request.body.password, user.password);

      if (passwordResult) // Valid password
      {
        if (user.verified)
        {
          const token = jsonwebtoken.sign
          (
            {
              user
            },
            process.env.SECRET_KEY,
            {
              expiresIn: request.body.remember ? '15d' : '1d'
            }
          );

          console.log("Found user");
          return response.status(200).send
          (
            {
              status: true, message: "Found user", token,
              expiresIn: request.body.remember ? 1296000 : 86400 //This token expires in 3600 seconds = 1 hour
            });
        }
        else // Account Not Verified
        {
          console.log("Account not verified");
          return response.status(401).send({status: false, message: "Account not verified"});
        }
      }
      else // Invalid password
      {
        console.log("Incorrect password");
        return response.status(401).send({status: false, message: "Incorrect password"});
      }
    }
    else
    {
      console.log("User not found");
      return response.status(401).send({status: false, message: "User not found"});
    }
  }
  catch (error)
  {
    console.log("Error while authenticating user : ", error);
    return response.status(401).send({status: false, message: error.message});
  }
}

exports.updateUser = async (request, response, next) =>
{
  try
  {
    const address =
      {
        locality: request.body.locality,
        landmark: request.body.landmark || '',
        pin_code: request.body.pin_code,
        city_district_town: request.body.city_district_town,
        state: request.body.state,
        address_line: request.body.address_line
      };

    const user =
      {
        first_name : request.body.first_name,
        last_name : request.body.last_name,
        phone: request.body.phone,
        address: address
      };

    const result = await User.findOneAndUpdate
    (
      {
        _id: request.user._id
      },
      user,
      {
        new: true
      }
    );

    return response.status(201).send
    (
      {
        status: true,
        message : 'Updated user details successfully',
        user: result
      }
    );
  }
  catch (error)
  {
    console.log("Error while updating user : ", error);

    let errorMessages = [];

    Object.entries(error.errors)
      .map(
        err =>
        {
          console.log(err[0]);
          errorMessages.push(err[0])
        }
      );

    return response.status(500).send
    (
      {
        status: false,
        message : errorMessages
      }
    );
  }
};

exports.fetchUserDetails = async (request, response, next) =>
{
  try
  {
    const result = await User.findOne
    (
      {
        _id: request.user._id
      }
    );

    return response.status(201).send
    (
      {
        status: true,
        message : 'Fetched user details successfully',
        user: result
      }
    );
  }
  catch (error)
  {
    console.log("Error while fetching user details : ", error);

    let errorMessages = [];

    Object.entries(error.errors)
      .map(
        err =>
        {
          console.log(err[0]);
          errorMessages.push(err[0])
        }
      );

    return response.status(500).send
    (
      {
        status: false,
        message : errorMessages
      }
    );
  }
};
