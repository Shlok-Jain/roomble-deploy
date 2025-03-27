const express = require(`express`);
require(`dotenv`).config(`../.env`); // Load environment variables
const authMiddleware = require("../middlewares/checkuser"); // Middleware for JWT auth
const Property = require(`../models/Property`)
const SECRET_KEY = process.env.SECRET_KEY;

const router = express.Router();


function toDMS(coordinate, isLatitude) {
    let absolute = Math.abs(coordinate);
    let degrees = Math.floor(absolute);
    let minutesFloat = (absolute - degrees) * 60;
    let minutes = Math.floor(minutesFloat);
    let seconds = ((minutesFloat - minutes) * 60).toFixed(1);

    let direction = isLatitude 
        ? (coordinate >= 0 ? "N" : "S") 
        : (coordinate >= 0 ? "E" : "W");

    return `${degrees}°${minutes}'${seconds}"${direction}`;
}


router.post('/get_property', async (req, res) => {
    try {
        const property_id = req.body.id;
        const property = await Property.findById(property_id);
        if (!property) {
            return res.status(404).json({
                success: false,
                message: "Property not found"
            });
        }

        let lat = property.Latitude;
        let lon = property.Longitude;

        let latDMS = toDMS(lat, true);
        let lonDMS = toDMS(lon, false);

        let result = `${latDMS}+${lonDMS}`;

        return res.status(200).json({
            success: true,
            property: property,
            navigatingUrl : `https://www.google.com/maps/place/${result}/@19.114135,72.8738457,41221m/data=!3m1!1e3!4m13!1m8!3m7!1s0x3be7c6306644edc1:0x5da4ed8f8d648c69!2sMumbai,+Maharashtra!3b1!8m2!3d19.0759837!4d72.8776559!16zL20vMDR2bXA!3m3!8m2!3d19.1755556!4d72.8655833?entry=ttu&g_ep=EgoyMDI1MDMxOS4yIKXMDSoJLDEwMjExNjM5SAFQAw%3D%3D`
        })
    } catch (e) {
        // console.log(e);
        return res.status(500).json({
            success: false,
            message: "Some internal Server error :( Please try again.",
        });
    }
})

module.exports = router;