const { response } = require("express");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require('jsonwebtoken');
const db = require('./db')
const SQL = require('sql-template-strings');

var AWS = require('aws-sdk'),
    region = "us-east-2",
    secretName = "arn:aws:secretsmanager:us-east-2:255459369867:secret:peepoo-token-secrets-5pGFfg",
    secret,
    decodedBinarySecret;

var client = new AWS.SecretsManager({
    region: region
});

app.use(express.json());

app.get("/", (req, res) => res.send("Hello Agnes!"));


app.get("/toilets", async (req, res) => {

    try {
        let buildings = await getBuildings();

        let toilets = await getToiletSummary();
    
        for (toilet in toilets) {
            let currentToilet = toilets[toilet];
            let currentBuildingToilets = buildings[currentToilet.buildingId].toilets;
            if (currentBuildingToilets) {
                currentBuildingToilets.push(currentToilet);
            }
        }
    
        return res.status(200).send(Object.values(buildings));
    } catch (error) {
        console.log(error);
        return res.status(500).send(error);
    }

});

async function getBuildings() {
    let rows;
    let statement = (SQL `
    SELECT * 
    FROM buildings`);

    try {
        let result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        console.log(error);
        return res.status(500).send(error);
    }
    
    let buildings = {};

    for (row in rows) {
        let current = rows[row]
        let building = {
            buildingId: current.id,
            buildingName: current.name,
            region: current.region,
            address: current.address,
            lat: current.latitude,
            lon: current.longitude,
            toilets: new Array(),
        };

        buildings[building.buildingId] = building;
    }

    return buildings;
}

async function getToiletSummary() {
    let rows;
    statement = (SQL `
    SELECT *
    FROM ToiletSummary`);

    let toilets = [];

    try {
        let result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        throw error;
    }

    let toiletFeatures = await getToiletFeatures();
    let toiletImages = await getToiletImages();

    for (row in rows) {
        let current = rows[row];
        let toilet = {
            toiletId: current.id,
            buildingId: current.building_id,
            name: current.name,
            avg_review: (current.avg_review || 0),
            review_count: (current.review_count || 0),
            toilet_features: toiletFeatures[current.id],
            toilet_images: toiletImages[current.id],
        };
        toilets.push(toilet);
    }

    return toilets;
}

async function getToiletFeatures() {
    let toilet_features = {}

    let rows;
    let statement = (SQL `
    SELECT * 
    FROM toilet_features`);

    try {
        let result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        throw error;
    }

    for (row in rows) {
        let current = rows[row];
        toilet_features[current.toilet_id] = parseToiletFeatures(current)
    }

    return toilet_features;
}

function parseToiletFeatures(row) {
    return {
        is_free: row.is_free,
        has_handheld_bidet: row.has_handheld_bidet,
        has_seat_bidet: row.has_seat_bidet,
        has_toilet_paper: row.has_toilet_paper,
        has_seat_cleaner: row.has_seat_cleaner,
        has_handicap: row.has_handicap,
        has_water_heater: row.has_water_heater,
        has_hand_dryer: row.has_hand_dryer,
        has_hand_soap: row.has_hand_soap,
        has_baby_change_station: row.has_baby_change_station,
        has_female: row.has_female,
        has_male: row.has_male,
    }
}

async function getToiletImages() {
    let toilet_images = {}

    let rows;
    let statement = (SQL `
    SELECT * 
    FROM toilet_images`);

    try {
        let result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        throw error;
    }

    for (row in rows) {
        let current = rows[row];
        if (Array.isArray(toilet_images[current.toilet_id])) {
            toilet_images[current.toilet_id].push(current.image_url)
        } else {
            toilet_images[current.toilet_id] = [];
            toilet_images[current.toilet_id].push(current.image_url)
        }
    }

    return toilet_images;
}

app.get("/toilets/:toiletid", async (req, res) => {
    const toiletid = parseInt(req.params.toiletid);
    let rows;

    // Retrieve toilet data
    let statement = (SQL `
    SELECT *
    FROM ToiletSummary
    WHERE id = (${toiletid})`);

    try {
        result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        res.status(500).send(error);
    }

    let toilet = rows[0];

    // Retrieve features
    statement = (SQL `
    SELECT *
    FROM toilet_features
    WHERE toilet_id = (${toiletid})`);

    try {
        result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        res.status(500).send(error);
    }

    let features = parseToiletFeatures(rows[0])

    // Retrieve reviews  
    let reviews = [];

    statement = (SQL `
    SELECT *
    FROM ReviewSummary
    WHERE toilet_id = (${toiletid})`);

    try {
        result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        res.status(500).send(error);
    }

    for (row in rows) {
        let current = rows[row];
        reviews.push({
            name: current.name,
            profile_picture_url: current.profile_picture_url,
            cleanliness_rating: current.cleanliness_rating,
            title: current.title,
            description: current.description,
            queue: current.queue,
        })
    }

    // Retrieve images;
    let images = [];

    statement = (SQL `
    SELECT *
    FROM toilet_images
    WHERE toilet_id = (${toiletid})`);

    try {
        result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        res.status(500).send(error);
    }

    for (row in rows) {
        let current = rows[row]
        images.push(current.image_url)
    }

    // Retrieve certifications
    let certifications = [];

    statement = (SQL `
    SELECT *
    FROM CertificationSummary
    WHERE toilet_id = (${toiletid})`);

    try {
        result = await db.query(statement);
        rows = result.rows;
    } catch (error) {
        res.status(500).send(error);
    }

    for (row in rows) {
        let current = rows[row];
        certifications.push({
            certification_authority: current.certification_authority,
            certification_logo: current.certification_logo,
            certification_webpage: current.certification_webpage,
            rating: current.rating,
        })
    }

    let data = {
        toiletName: toilet.name,
        avg_review: toilet.avg_review,
        review_count: toilet.review_count,
        distance: 0,
        features: features,
        reviews: reviews,
        toilet_images: images,
        certifications: certifications,
    }

    return res.status(200).send(data);

});


app.get("/toilets/nearest", (req, res) => {
    const {lat, lon, limit, offset} = req.body;

});

app.get("/toilets/search", (req, res) => {
    const {keyword, limit} = req.body;

});

app.post("/review/:toiletId", authenticateToken, async (req, res) => {
    const toiletId = req.params.toiletId;
    const userId = req.user.id;
    try {
        await addToiletReview(userId, toiletId, req.body);
    } catch (err) {
        return res.status(500).send('Error in creating review');
    }
    return res.sendStatus(200);
})

app.put("/review/:toiletId", authenticateToken, async (req, res) => {
    const toiletId = req.params.toiletId;
    const userId = req.user.id;
    try {
        await changeToiletReview(userId, toiletId, req.body);
    } catch (err) {
        return res.status(500).send('Error in editing review');
    }
    return res.sendStatus(200);
})

app.post("/report/:toiletId", authenticateToken, async (req, res) => {
    const toiletId = req.params.toiletId;
    const userId = req.user.id;
    try {
        await addToiletReport(userId, toiletId, req.body);
    } catch (err) {
        return res.status(500).send('Error in creating report');
    }
    return res.sendStatus(200);
})

app.get("/report/profile", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    let row;

    const statement = (SQL `
    SELECT *
    FROM CustomerSummary
    WHERE id = (${userId})`);

    try {
        let result = await db.query(statement);
        row = result.rows;
    } catch (error) {
        return res.status(500).send(error);
    }

    return res.status(200).json(row[0])
})

app.post("/report/profile", authenticateToken, async (req, res) => {
    const { name, profile_picture } = req.body;
})

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null) {
        return res.sendStatus(401);
    }

    jwt.verify(token, tokenSecret.ACCESS_TOKEN_SECRET, (error, user) => {
            if (error) {
                console.log(error);
                return res.sendStatus(403);
            } 
            req.user = user;
            next();
        })
    
}

async function addToiletReview(userId, toiletId, review) {
    let statement = SQL`
    INSERT 
    INTO reviews("user_id", "toilet_id", "cleanliness_rating", "title", "description", "queue")
    VALUES (${userId}, ${toiletId}, ${review.cleanlinessRating}, ${review.title}, ${review.description}, ${review.queue});`;

    await db.query(statement);
} 

async function changeToiletReview(userId, toiletId, review) {
    let statement = SQL`
    UPDATE reviews
    SET
    cleanliness_rating= ${review.cleanlinessRating}, 
    title = ${review.title},
    description = ${review.description},
    queue = ${review.queue}
    WHERE
    user_id = ${userId}
    AND toilet_id = ${toiletId};`;

    await db.query(statement);
}

async function addToiletReport(userId, toiletId, report) {
    let statement = SQL`
    INSERT 
    INTO reports("user_id", "toilet_id", "issue", "items", "description")
    VALUES (${userId}, ${toiletId}, ${report.issue}, ${report.items.join(", ")}, ${report.description});`;

    await db.query(statement);
} 

async function getTokenSecrets() {
    try {
        var data = await client.getSecretValue({ SecretId: secretName }).promise();
        
        if ('SecretString' in data) {
            secret = data.SecretString;
            return secret;
        } else {
            let buff = Buffer.alloc(data.SecretBinary, 'base64');
            decodedBinarySecret = buff.toString('ascii');
            return decodedBinarySecret
        }
    } catch (err) {
        if (err) {
            throw err;
        }
    }
}

getTokenSecrets().then(data => {
    tokenSecret = data;
    tokenSecret = JSON.parse(tokenSecret)
    app.listen(port)

    console.log("Successfully initialised secret keys.")
    console.log(`Now listening on port ${port}.`)

}).catch(err => {
    console.log('Server init failed: ' + err);
})