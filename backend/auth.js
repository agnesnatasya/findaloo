require('dotenv').config();

const db = require('./db');
const SQL = require('sql-template-strings');

const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const token_secret = JSON.parse(getTokenSecrets());
app.use(express.json());

app.post('/sign-up/customer', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = {
      roleId: 2,
      email: req.body.email,
      authType: req.body.authType,
      password: hashedPassword
    };

    try {
      await db.query("BEGIN");
      let statement = SQL`
            INSERT 
            INTO users("role_id", "email", "auth_type")
            VALUES (${user.roleId}, ${user.email}, ${user.authType})`;
      await db.query(statement);
    } catch (error) {
      console.log("db.query():", error);
      console.log("Transaction ROLLBACK called");
      await db.query("ROLLBACK");
      return res.status(409).send('User already exist');
    }

    try {
      const lastRow = await getLastUserId();
      const lastUserId = lastRow.rows[0].id;
      const customerProfile = {
        userId: lastUserId,
        name: req.body.name,
        profilePicture: req.body.profilePicture
      };
      if (req.body.authType === "native") {
        await addCustomerProfileToDb(customerProfile);
        await addNativeAuthPasswordToDb({
          email: req.body.email,
          authType: req.body.authType,
          password: hashedPassword,
        });
        } else {
          await addCustomerProfileToDb(customerProfile)
        }
        await db.query("COMMIT");
    } catch (error) {
        console.log("db.query():", error);
        console.log("Transaction ROLLBACK called");
        await db.query("ROLLBACK");
        return res.status(500).send('Error in adding user');
    }
    return res.sendStatus(200);
  } catch {
    res.status(500).send('Error in adding user');
  }
});

app.post("/sign-up/management", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = {
      roleId: 3,
      email: req.body.email,
      authType: req.body.authType,
      password: hashedPassword
    };

    try {
      await db.query("BEGIN");
      let statement = SQL`
            INSERT 
            INTO users("role_id", "email", "auth_type")
            VALUES (${user.roleId}, ${user.email}, ${user.authType})`;
      await db.query(statement);
    } catch (error) {
      console.log("db.query():", error);
      console.log("Transaction ROLLBACK called");
      await db.query("ROLLBACK");
      return res.status(409).send('User already exist');
    }
    
    try {
      const lastRow = await getLastUserId();
      const lastUserId = lastRow.rows[0].id;
      const managementProfile = {
        userId: lastUserId,
        companyName: req.body.companyName,
        displayEmail: req.body.displayEmail,
        companyLogo: req.body.companyLogo,
        officeAddress: req.body.officeAddress,
      };
      if (req.body.authType === "native") {
        await addManagementProfileToDb(managementProfile);
        await addNativeAuthPasswordToDb({
          email: req.body.email,
          authType: req.body.authType,
          password: hashedPassword,
        });
      } else {
        await addManagementProfileToDb(managementProfile);
      }
      await db.query("COMMIT");
    } catch (error) {
      console.log("db.query():", error);
      console.log("Transaction ROLLBACK called");
      await db.query("ROLLBACK");
      return res.status(500).send('Error in adding user');
    }
    return res.sendStatus(200);
  } catch {
    res.status(500).send('Error in adding user');
  }
});

app.post('/login', async (req, res) => {
    const username = req.body.username;
    const user = { name: username };

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await addRefreshTokenToDb(refreshToken);

    res.json({
        accessToken: accessToken,
        refreshToken: refreshToken,
    });
});

app.delete('/logout', (req, res) => {
    removeRefreshTokenFromDb(token);
    res.sendStatus(204);
})

app.post('/token', (req, res) => {
    const refreshToken = req.body.token;
    
    if (refreshToken == null) {
        return res.sendStatus(401);
    }

    if (!checkIfRefreshTokenExists(token)) {
        return res.sendStatus(403);
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (error, user) => {
        if (error) {
            return res.sendStatus(403);
        }

        const accessToken = generateAccessToken(user)
        res.json({
            accessToken: accessToken,
        });
    })

})


function getTokenSecrets() {
  // Load the AWS SDK
  var AWS = require('aws-sdk'),
    region = "us-east-2",
    secretName = "peepoo-token-secrets",
    secret,
    decodedBinarySecret;

  // Create a Secrets Manager client
  var client = new AWS.SecretsManager({
    region: region
  });

  client.getSecretValue({ SecretId: secretName }, function (err, data) {
    if (err) {
      if (err.code === 'DecryptionFailureException')
        throw err;
      else if (err.code === 'InternalServiceErrorException')
        throw err;
      else if (err.code === 'InvalidParameterException')
        throw err;
      else if (err.code === 'InvalidRequestException')
        throw err;
      else if (err.code === 'ResourceNotFoundException')
        throw err;
    }
    else {
      if ('SecretString' in data) {
        secret = data.SecretString;
        console.log(secret);
      } else {
        let buff = new Buffer(data.SecretBinary, 'base64');
        decodedBinarySecret = buff.toString('ascii');
      }
    }

    // Your code goes here. 
  });
}

getAccessToken();
async function getLastUserId() {
    let statement = SQL`
    SELECT id
    FROM users
    ORDER BY id DESC
    LIMIT 1`;
    return db.query(statement);
}

async function addCustomerProfileToDb(customerProfile) {
  let statement = SQL`
    INSERT 
    INTO customer_profiles("user_id", "name", "profile_picture")
    VALUES (${customerProfile.userId}, ${customerProfile.name}, ${customerProfile.profilePicture})`;

  await db.query(statement);
} 

async function addManagementProfileToDb(managementProfile) {
  let statement = SQL`
    INSERT 
    INTO management_profiles
    VALUES (
      ${managementProfile.userId},
      ${managementProfile.companyName},
      ${managementProfile.displayEmail},
      ${managementProfile.companyLogo},
      ${managementProfile.officeAddress}
    )`;

  await db.query(statement);
}

async function addNativeAuthPasswordToDb(credentials) {
  let statement = SQL`
    INSERT 
    INTO native_auth_passwords
    VALUES (${credentials.email}, ${credentials.authType}, ${credentials.password})`;

  await db.query(statement);
}

async function checkIfRefreshTokenExists(token) {
    let statement = (SQL `
    SELECT *
    FROM refresh_tokens R
    WHERE R.token = ${token}`);

    const { rows } = await db.query(statement)

    if (rows[0].token === token) {
        return true;
    }
    
    return false;

}

async function addRefreshTokenToDb(token) {
    let statement = (SQL `
    INSERT 
    INTO refresh_tokens
    VALUES (${token})`);

    const { error } = await db.query(statement)

    if (error) {
        return false;
    }

    return true;
}

async function removeRefreshTokenFromDb(token) {
    let statement = (SQL `
    DELETE 
    FROM refresh_tokens
    WHERE token = (${token})`);

    const { error } = await db.query(statement)

    if (error) {
        return false;
    }

    return true;
}

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '60m'
    })
}

function generateRefreshToken(user) {
    return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
}

app.listen(4000);