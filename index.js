const express = require('express');
const { createServer } = require('node:http');
const dotenv = require('dotenv');
const Landlord_routes_auth = require(`./routes/Landlord_auth`)//contains Landlord authentication routing
const Tenant_routes_auth = require('./routes/Tenant_auth')//COntains tenant authentication
dotenv.config(); // Load environment variables
const ForgotPassword_routes = require(`./routes/ForgotPassword`);
const SetLatLong = require(`./routes/SetLat_Long.js`);
const Searching_Routes = require(`./routes/Searching_Routes`)
const BookMark_Routes = require(`./routes/Bookmark`);
const View_profiles = require(`./routes/view_profiles`);
const Deleteprofile = require(`./routes/deleteProfile`);
const listProperty = require(`./routes/addProperty`);
const deleteProperty = require(`./routes/deleteProperty`);
const changePassword = require('./routes/changePassword');
const messageRoutes = require('./routes/message');
const enlist_delist = require(`./routes/lisst_delist_prop`);
const fileUpload = require('express-fileupload');
const updates = require(`./routes/update.js`);
const propertyReview = require(`./routes/reviewProperty`);
const cors = require(`cors`);
const Interested = require(`./routes/Interested`);
const path = require(`path`);
const mongoconnect = require('./mongodb'); // Ensures MongoDB connects
const { MongoClient } = require("mongodb");

const SECRET_KEY = process.env.SECRET_KEY; // Change this to a secure secret key

const app = express();
app.use('/Pictures', express.static(path.join(__dirname, 'Pictures')));
app.use(fileUpload());
const server = createServer(app);
app.use(cors());


// Import database connection
require('./mongodb'); // Ensures MongoDB connects

const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

const onlineUsers = new Map();
io.on('connection', (socket) => {
    socket.on('user_connected', (userID) => {
        onlineUsers.set(userID, socket.id);
        //send indication to all users to update their online users status
        // dont send and data, just send the event
        io.emit('update_online_users');
    });

    socket.on('disconnect', () => {
        for (const [key, value] of onlineUsers.entries()) {
            if (value === socket.id) {
                onlineUsers.delete(key);
                break;
            }
        }
        //send indication to all users to update their online users status
        // dont send and data, just send the event
        io.emit('update_online_users');
    });
});

// Middleware
app.use(express.json()); // Allows Express to parse JSON request bodies

// Import models
const Landlord = require('./models/Landlord');
const Tenant = require('./models/Tenant'); // Added Tenant model

//http://127.0.0.1:3000/api/SetLatLong/SetLong_Lat
// Routes
app.use(`/api/Interested`, Interested);
app.use(`/api/SetLatLong`, SetLatLong);
app.use(`/api/updates`, updates);
app.use(`/api/Listing_Delisting`, enlist_delist);
app.use(`/api/view_profiles`, View_profiles);
app.use(`/api/Deleting_routes`, Deleteprofile);
app.use(`/api/forgotPassword`, ForgotPassword_routes);//Send accoutnt type in the request body
app.use(`/api/changePassword`, changePassword);
app.use('/api/Landlord/auth', Landlord_routes_auth); // Added Landlord Routes
app.use('/api/Tenant/auth', Tenant_routes_auth); // Added Tenant Routes
app.use('/api/reviews', require('./routes/reviewroutes')); // Added Review Routes
app.use(`/api/Search_Routes`, Searching_Routes);//Searching routes, add logic for searching properties also here only
app.use(`/api/BookMarking_Routes`, BookMark_Routes);
// app.use(`/api/DeleteProperty`, deleteProperty);
app.use(`/api/listproperty`, listProperty);
app.use(`/api/deleteproperty`, deleteProperty);
app.use('/messages', messageRoutes(io, onlineUsers));
app.use('/api/auth', require('./routes/getuser'));
app.use('/api/property', require('./routes/viewProperty'));
app.use('/api/reviewProperty', propertyReview);

// Default Route
// app.get('/', (req, res) => {
//     res.send('Hello World');
// });

// Serve static files from the Vite dist folder
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/*', (req,res)=>{
    // serve /dist/index.html for all other routes
    return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
})


// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
