const jsonwebtoken = require('jsonwebtoken');

const authenticate = (request, response, next) =>
{
  try
  {
    const token = request.headers.authorization.split(" ")[1]; //Remove "Bearer "

    const payload = jsonwebtoken.verify
    (
      token,
      process.env.SECRET_KEY
    );

    request.user = payload.user;

    next(); // Authentication passed, Continue next process.
  }
  catch (error)
  {
    console.log(error);

    return response.status(401).send
    (
      {
        status: false,
        message : 'Authentication failed : ' + 'Invalid token'
      }
    )
  }
}

module.exports = authenticate;
