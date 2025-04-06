const express = require(`express`);
const router = express.Router();
require(`dotenv`).config(`../.env`); // Load environment variables
const jwt = require(`jsonwebtoken`);
const bcrypt = require(`bcrypt`)
const Sendmail = require("../helper_funcs/mailSender"); // MailSender
const authMiddleware = require("../middlewares/checkuser"); // Middleware for JWT auth

const SECRET_KEY = process.env.SECRET_KEY; // Change this to a secure secret key


const Landlord = require(`../models/Landlord`);
const Tenant = require(`../models/Tenant`);
const { Landlord_OTP,  Tenant_OTP } = require(`../models/OTP_models`);



async function Hashpassword(plainPassword) {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
}

//Send accounttype and email in the request body
router.post(`/enteremail`, async(req, res) => {
    try {
        const {email, accounttype} = req.body;
        let user;
        if(accounttype === `tenant`){
            user = await Tenant.findOne({email : email});
        }
        else if(accounttype === `landlord`){
            user = await Landlord.findOne({email : email});
        }
        else{
            return res.status(400).json({
                success : false,
                message : "Bad Account type"
            })
        }

        if(!user){
            return res.status(401).json({
                success : false,
                message : "No such user exists"
            })
        }
        else{
            const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: "5m" });

            if(accounttype === `tenant`){

                let ifExists = await Tenant_OTP.findOne({email : email});
                
                if(ifExists){
                    let new_OTP = (Math.floor(100000 + Math.random() * 900000)).toString();
                    await Sendmail(email, `Welcome once again to Roomble`, `Here is your new OTP ${new_OTP}`);
                    await ifExists.updateOne({ OTP: new_OTP });
                    
                    return res.status(200).json({ 
                        success : true,
                        message: "New OTP sent",
                        authtoken : token
                    });
                }
                
                let new_OTP = (Math.floor(100000 + Math.random() * 900000)).toString();
                await Sendmail(email, `Welcome once again to Roomble`, `Hello, If it was you who was trying to reset your password, here's your OTP ${new_OTP}. However if this wasn't you, Kindly ignore.`);
                const newlyCreatedUser = new Tenant_OTP({
                    name : user.name,
                    email : user.email,
                    password: user.password,
                    OTP: new_OTP,
                    locality : user.locality,
                    smoke : user.smoke,
                    pets : user.pets,
                    veg : user.veg,
                    gender : user.gender,
                    flatmate : user.flatmate,
                });
                await newlyCreatedUser.save();
                
                return res.status(200).json({
                    success : true,
                    authtoken : token
                })
            }
            else if(accounttype === `landlord`){
                let ifExists = await Landlord_OTP.findOne({email : email});
                
                if(ifExists){
                    let new_OTP = (Math.floor(100000 + Math.random() * 900000)).toString();
                    await Sendmail(email, `Welcome once again to Roomble`, `Here is your new OTP ${new_OTP}`);
                    await ifExists.updateOne({ OTP: new_OTP });
                    
                    return res.status(200).json({ 
                        success : true,
                        message: "New OTP sent",
                        authtoken : token
                    });
                }
                
                let new_OTP = (Math.floor(100000 + Math.random() * 900000)).toString();
                await Sendmail(email, `Welcome once again to Roomble`, `Hello, If it was you who was trying to reset your password, here's your OTP ${new_OTP}. However if this wasn't you, Kindly ignore.`);
                
                const newlyCreatedUser = new Landlord_OTP({
                    name : user.name,
                    type : user.type,
                    email : user.email,
                    password: user.password,
                    OTP: new_OTP,
                    propertyList : user.propertyList,
                    conversations : user.conversations,
                });
                await newlyCreatedUser.save();
                console.log(`new Landord OTp saved with email`, newlyCreatedUser.email);
                
                return res.status(200).json({
                    success : true,
                    authtoken : token
                })
            }


        }
        
    } catch (error) {
        console.log(`error in forgot password`)
        console.error(error);
        return res.status(500).json({
            success : false,
            message : "internal server error"
        })
    }
})

//send authtoken and accounttype and Entered_OTP
router.post(`/enterOTP`, authMiddleware , async (req,res) => {

    try{
        let useremail = req.user.email;
        let userid = req.user.id;
        let Entered_OTP = req.body.Entered_OTP;
        let accounttype = req.body.accounttype;
        // "accounttype
        let user;
        if(accounttype === `tenant`){
            user = await Tenant_OTP.findOne({email : useremail});
        }
        else if(accounttype === `landlord`){
            // console.log(`here`);
            user = await Landlord_OTP.findOne({email : useremail});
            // console.log(`user = ` , user);
            // console.log(useremail);
        }
        else{
            // console.log(accounttype);
            return res.status(401).json({
                success : false,
                message : "No accounttype"
            })
        }

        if(!user){
            return res.status(404).json({
                success : false,
                message : "Please request an OTP. Your OTP has been Expired/ Not sent."
            })
        }

        else if(user.OTP === Entered_OTP){
            // await ifExists.updateOne({ OTP: new_OTP });
            await user.updateOne({Allow_changes : true});

            return res.status(200).json({
                success : true,
                message : "Correct OTP entered, access granted."
            })
        }
        else{
            return res.status(401).json({
                success : false,
                message : 'Wrong OTP, pls try again'
            })
        }
        
    } catch (err){
        console.log(err);
        console.log(`error in forgot passowrd 184`)
        return res.status(500).json({
            success : false,
            message : "Internal Server error"
        })
    }
} )

//send accounttype and authtoken in header. newPassword in body
router.post(`/ForgotPassword`, authMiddleware, async (req,res) => {
    try {
        let useremail = req.user.email;
        let newPassword = req.body.newPassword;
        const Hashedpassword = await Hashpassword(newPassword);
        let accounttype = req.body.accounttype;
        if(accounttype === `tenant`){
            let user = await Tenant_OTP.findOne({email : useremail});
            console.log(`user = ` , user);
            if(!user){
                return res.status(404).json({
                    success : false,
                    message : "OTP not found / OTP expired"
                })
            }
            if(user.Allow_changes === false){
                return res.status(401).json({
                    success : false,
                    message : "Not Authorized to make changes"
                })
            }
            else{
                let tenant_user = await Tenant.findOne({email : useremail});
                tenant_user.password = Hashedpassword;
                await tenant_user.save();
                return res.status(200).json({
                    success : true,
                    message : "Successfully updated"
                })
            }
        }
        else if(accounttype === `landlord`){
            let user = await Landlord_OTP.findOne({email : useremail});
            console.log(`user = ` , user);
            if(!user){
                return res.status(404).json({
                    success : false,
                    message : "OTP not found / OTP expired"
                })
            }
            if(user.Allow_changes === false){
                return res.status(401).json({
                    success : false,
                    message : "Not Authorized to make changes"
                })
            }
            else{
                let landlord_user = await Landlord.findOne({email : useremail});
                landlord_user.password = Hashedpassword;
                await landlord_user.save();
                return res.status(200).json({
                    success : true,
                    message : "Successfully updated"
                })
            }
        }

    } catch (error) {
        console.error(error);
        console.log(`error in forgot password 250`)
        return res.status(500).json({
            success : false,
            message : `Internal server error ${error}` 
        })
    }
})

module.exports = router;
