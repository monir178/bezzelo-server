const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const app = express();
const port = process.env.PORT || 5000;

//middle wares
app.use(cors());
app.use(express.json());



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

        // Cart collection
        const cartCollection = client.db('bezzelo').collection('cart');


        app.get('/jwt', async (req, res) => {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            const usersCollection = client.db('bezzelo').collection('users');
            const user = await usersCollection.findOne({ email });

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '15d' });
                return res.json({ accessToken: token });
            } else {
                return res.status(404).json({ error: 'User not found' });
            }
        });

        //get all users
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const existingUser = await usersCollection.findOne({ email: user.email });

                if (existingUser) {
                    return res.status(409).json({ message: 'User already exists' });
                } else {
                    const result = await usersCollection.insertOne(user);
                    return res.status(201).json({ message: 'User created successfully' });
                }
            } catch (error) {
                // Check if the error is due to duplicate key (user already exists)
                if (error.code === 11000) {
                    return res.status(409).json({ message: 'User already exists' });
                } else {
                    console.error('Error saving user to database:', error);
                    return res.status(500).json({ message: 'Internal server error' });
                }
            }
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


        // Add item to cart
        app.post('/cart', async (req, res) => {
            try {
                const cartItem = req.body;
                const result = await cartCollection.insertOne(cartItem);
                res.status(201).json({ message: 'Item added to cart successfully' });
            } catch (error) {
                console.error('Error adding item to cart:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // Update item quantity in cart
        app.put('/cart/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const { quantity } = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = { $set: { quantity } };
                const result = await cartCollection.updateOne(filter, updateDoc);
                res.json({ message: 'Cart item updated successfully' });
            } catch (error) {
                console.error('Error updating cart item:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // Remove item from cart
        app.delete('/cart/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const result = await cartCollection.deleteOne(filter);
                res.json({ message: 'Item removed from cart successfully' });
            } catch (error) {
                console.error('Error removing item from cart:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        // Get cart items for a user
        app.get('/cart/:userId', async (req, res) => {
            try {
                const userId = req.params.userId;
                const query = { userId };
                const cartItems = await cartCollection.find(query).toArray();
                res.json(cartItems);
            } catch (error) {
                console.error('Error getting cart items:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

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