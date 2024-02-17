const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ulnoerh.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const bagCollection = client.db('bezzelo').collection('bags');
        const foodCollection = client.db('bezzelo').collection('foods');
        const reviewCollection = client.db('bezzelo').collection('reviews');
        const usersCollection = client.db('bezzelo').collection('users');


        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '7d' })
                return res.send({
                    accessToken: token
                })
            }
            console.log(user);
            res.status(403).send({ accessToken: '' })
        });


        //get all users
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        //create user and save their data in mongodb
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);

        });

        // make a user admin
        app.put('/users/admin/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result);
        })

        //for adding bag
        app.post('/bags', verifyJWT, async (req, res) => {
            try {
                const result = await bagCollection.insertOne(req.body);
                // console.log("result from 33", result);
                if (result.insertedId) {
                    res.send({
                        success: true,
                        message: "Successfully added your bag",

                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't add the bag"
                    });
                };
            }
            catch (error) {
                console.log(error.name, error.message)
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });

        //get all bags from mongodb
        app.get('/allbags', async (req, res) => {
            try {
                const query = {};
                const cursor = bagCollection.find(query);
                const allbags = await cursor.toArray();

                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: allbags,
                })
            }
            catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        })

        //limit bags
        app.get('/bags', async (req, res) => {
            try {
                const query = {};
                const cursor = bagCollection.find(query);
                const bags = await cursor.limit(3).toArray();

                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: bags,
                });
            }
            catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        })

        // get single bag
        app.get('/bag/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const bagDetails = await bagCollection.findOne(query);
                console.log(bagDetails);
                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: bagDetails,
                })
            }
            catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }

        })

        // Edit bag 
        app.patch('/bags/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            try {
                const result = await bagCollection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
                if (result.matchedCount) {
                    res.send({
                        success: true,
                        message: `Updated successfully`,
                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't update the bag",
                    });
                }
            } catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });

        //delete bag
        app.delete('/bags/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            try {
                const result = await bagCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount) {
                    res.send({
                        success: true,
                        message: 'Review deleted successfully',
                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't delete the review",
                    });
                }
            } catch (error) {
                console.error(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });

        //for adding food
        app.post('/foods', verifyJWT, async (req, res) => {
            try {
                const result = await foodCollection.insertOne(req.body);
                // console.log("result from 33", result);
                if (result.insertedId) {
                    res.send({
                        success: true,
                        message: "Successfully added your food",

                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't add the food"
                    });
                };
            }
            catch (error) {
                console.log(error.name, error.message)
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });

        //delete food
        app.delete('/foods/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            try {
                const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount) {
                    res.send({
                        success: true,
                        message: 'Food deleted successfully',
                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't delete the Food",
                    });
                }
            } catch (error) {
                console.error(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });

        //get all foods from mongodb
        app.get('/allfoods', async (req, res) => {
            try {
                const query = {};
                const cursor = foodCollection.find(query);
                const allfoods = await cursor.toArray();

                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: allfoods,
                })
            }
            catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        })

        //for adding review
        app.post('/reviews', verifyJWT, async (req, res) => {
            try {
                const result = await reviewCollection.insertOne(req.body);
                console.log(result);
                if (result.insertedId) {
                    res.send({
                        success: true,
                        message: "Successfully added your review",

                    });
                }
                else {
                    res.send({
                        success: false,
                        error: "Couldn't add your review"
                    });
                }

            }
            catch (error) {
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        })
        //getting reviews
        app.get('/reviews/:id', async (req, res) => {
            try {
                const id = req.params.id;
                console.log(id);
                const query = { bag_id: id }
                const singleReview = await reviewCollection.find(query).toArray();
                console.log(singleReview);
                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: singleReview,
                })
            }
            catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                });
            }
        });
        //get reviews by email
        app.get('/reviews', verifyJWT, async (req, res) => {
            // console.log(req.headers.authorization);
            const decoded = req.decoded;

            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'forbidden' })
            }
            try {
                let query = {};

                if (req.query.email) {
                    query = {
                        email: req.query.email
                    }
                }
                const cursor = reviewCollection.find(query);
                const reviewByEmail = await cursor.toArray();
                res.send({
                    success: true,
                    message: "successfully got the data",
                    data: reviewByEmail
                })

                console.log(req.query.email);
            }
            catch (error) {
                console.log(error.name, error.message);
                res.send({
                    success: false,
                    error: error.message,
                })
            }
        })


    }
    finally {
        console.log("Operation is done.")
    }
}
run().catch(err => console.error(err));


app.get('/', (req, res) => {
    res.send('bezzelo server is running');
})

app.listen(port, () => {
    console.log(`Bezzelo Server is running on port ${port}`);
})