const express = require("express")
const router = express.Router();
const Landlord = require("../models/Landlord");
const mongoose = require(`mongoose`)
const Property = require("../models/Property");
const Tenant = require("../models/Tenant");
const SendMailer = require(`../helper_funcs/mailSender`);//async fucntion which helps upload images
const authMiddleware = require("../middlewares/checkuser");
require(`dotenv`).config(`../.env`);
const config = require(`../config`);

router.post(`/Tenant_Prop` , authMiddleware , async (req, res) => {
    try {
        const Tenant_id = req.user.id;
        const Property_id = req.body.property_id;

        if (!mongoose.Types.ObjectId.isValid(Property_id)) {
              // console.log(`!!!!INVALID ID FOUND!!!!!`);
              // console.log(id);
              return res.status(400).json({ error: `${Property_id} is invalid ID` });
            }
        
        let Actual_Tenant = await Tenant.findById(Tenant_id);

        let Actual_Property = await Property.findById(Property_id).populate(`landlord`);

        if(!Actual_Property){
            return res.status(404).json({
                success : false,
                message : "No such property exists"
            });
        }

        let result = await SendMailer(Actual_Property.landlord.email, "Someone is interested in your property" , `Greetings, ${Actual_Property.landlord.name}. ${Actual_Tenant.name} is interested in your property at ${Actual_Property.address}. Mail him at ${Actual_Tenant.email} or message him via Roomble.`);

        console.log(result);

        if(result){
            return res.status(200).json({
                success : true,
                message : `Owner was notified`
            })
        }
        else{
            return res.status(500).json({
                success : false,
                message : "Error sending email. Please try after a few mins"
            })
        }

        
        
    } catch (e) {
        console.log(`error in Interested.js`);
        console.error(e);
        return res.status(500).json({
            success : false,
            message : `error in Backend`
        })
    }
})

module.exports = router;
