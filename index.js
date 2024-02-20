const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());
app.use(express.static('public'))

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ulnoerh.mongodb.net/?retryWrites=true&w=majority`;

let client = null;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
try {
    client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,

        },
        useNewUrlParser: true,

    });
} catch (error) {
    console.error(error);
}



async function run() {
    try {
        const productCollection = client.db('bezzelo').collection('products');

        const reviewCollection = client.db('bezzelo').collection('reviews');

        const categoryCollection = client.db('bezzelo').collection('categories');

        const usersCollection = client.db('bezzelo').collection('users');



        //get all users
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        //create user and save their data in mongodb
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result);

        });

        // make a user admin
        app.put('/users/admin/:id', async (req, res) => {
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

        //get all category
        app.get('/categories', async (req, res) => {
            try {
                const query = {};
                const cursor = categoryCollection.find(query);
                const categories = await cursor.toArray();

                res.send({
                    success: true,
                    message: "Successfully got the categories",
                    data: categories,
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

        app.get('/categories/:id', async (req, res) => {

            try {
                const categoryId = parseInt(req.params.id);
                const query = { category_id: categoryId };
                const categoryProducts = await productCollection.find(query).toArray();
                res.send({
                    success: true,
                    message: 'Successfully got the category products',
                    data: categoryProducts,
                })

            } catch (error) {
                console.error('Error occurred while fetching products by category ID', error);
                res.status(500).send({
                    success: false,
                    error: error.message,
                });
            }

        })

        //for adding product
        app.post('/products', async (req, res) => {
            try {
                const result = await productCollection.insertOne(req.body);
                // console.log("result from 33", result);
                if (result.insertedId) {
                    res.send({
                        success: true,
                        message: "Successfully added your product",

                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't add the product"
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

        //get all products from mongodb
        app.get('/allproducts', async (req, res) => {
            try {
                const query = {};
                const cursor = productCollection.find(query);
                const allproducts = await cursor.toArray();

                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: allproducts,
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

        //limit products
        app.get('/products', async (req, res) => {
            try {
                const query = {};
                const cursor = productCollection.find(query);
                const products = await cursor.limit(3).toArray();

                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: products,
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

        // get single product
        app.get('/product/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) }
                const productDetails = await productCollection.findOne(query);
                console.log(productDetails);
                res.send({
                    success: true,
                    message: "Successfully got the data",
                    data: productDetails,
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

        // Edit product 
        app.patch('/products/:id', async (req, res) => {
            const id = req.params.id;
            try {
                const result = await productCollection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
                if (result.matchedCount) {
                    res.send({
                        success: true,
                        message: `Updated successfully`,
                    });
                } else {
                    res.send({
                        success: false,
                        error: "Couldn't update the product",
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

        //delete product
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            try {
                const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
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


        //for adding review
        app.post('/reviews', async (req, res) => {
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
                const query = { product_id: id }
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
        app.get('/reviews', async (req, res) => {
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