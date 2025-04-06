const express = require(`express`);
const Towns = require("../models/Towns"); // Model for town distances
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
require(`dotenv`).config(`../.env`); // Load environment variables
const authMiddleware = require("../middlewares/checkuser");
const router = express.Router();
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY;

// Searching Flatmates

//Recommendation Score Formulation

// To calculate a recommendation score between the searching tenant and potential flatmates, 
// we use a similarity function that combines:

// (i)Locality Proximity: More similar if desired localities are closer.
// (ii)Boolean Attribute Matching: More similarity if preferences (gender, smoke, veg, pets) match.


// Mathematical Approach

// Let:
// (i) 𝑑(l1,l2) be the distance between localities 
// (ii) sim(bool) be the similarity score for boolean preferences.


// Locality Similarity

// We use a function to map distances to similarity scores:
// sim(locality) = 1/(1 + d(l1,l2)), 
// where a smaller distance gives a higher score.


// Boolean Similarity

// For each boolean feature (gender, smoke, veg, pets):
// sim(bool) = matches / total boolean attributes


// Final Recommendation Score

// S=α⋅sim(locality) + (1−α)⋅sim(bool),
// where α is a weight factor (e.g., 0.7 for locality and 0.3 for boolean preferences).

router.get("/SearchFlatmates", authMiddleware, async (req, res) => {
    try {
        const tenant_id = req.user.id;
        console.log(tenant_id);

        if (!tenant_id) {
            return res.status(400).json({ success: false, message: "Tenant ID is required" });
        }

        // Fetch the current tenant's details
        const tenant = await Tenant.findById(tenant_id).select("-password");
        if (!tenant) {
            return res.status(404).json({ success: false, message: "Tenant not found" });
        }

        // Fetch town data for distance calculations
        const townData = await Towns.findOne({ name: tenant.locality });
        if (!townData) {
            return res.status(400).json({ success: false, message: "Invalid locality" });
        }

        // Fetch the user's bookmarks
        let user = await Tenant.findById(tenant_id);

        // **Filter for only tenants who are looking for a flatmate**
        let potentialFlatmates = await Tenant.find({
            _id: { $ne: tenant_id },
            locality: { $exists: true },
            flatmate: true
        }).select("-password");

        // Compute recommendation scores
        const alpha = 0.7; // Weight for locality importance
        let scoredResults = potentialFlatmates.map(flatmate => {
            // Fetch the correct distance value
            let distance = townData.distances.get(flatmate.locality);

            if (flatmate.locality === tenant.locality) {
                distance = 0;
            }

            if (distance === undefined) {
                distance = 100; // Default distance
            }

            const localitySimilarity = 1 / (1 + Math.cbrt(distance));

            let booleanMatches = 0;
            if (flatmate.gender === tenant.gender) booleanMatches++;
            if (flatmate.smoke === tenant.smoke) booleanMatches++;
            if (flatmate.veg === tenant.veg) booleanMatches++;
            if (flatmate.pets === tenant.pets) booleanMatches++;

            const booleanSimilarity = booleanMatches / 4; // Normalized to [0,1]

            let score = alpha * localitySimilarity + (1 - alpha) * booleanSimilarity;

            return {
                ...flatmate.toObject(),
                recommendationScore: score,
                bookmarked: user.bookmarks_tenants.includes(flatmate._id)
            };
        });

        // Sort by score in descending order
        scoredResults.sort((a, b) => b.recommendationScore - a.recommendationScore);

        // **Extract filter parameters from the request query**
        const { locality, gender, smoke, veg, pets } = req.query;

        // Convert to Boolean only if defined
        const genderFilter = gender !== undefined ? gender === "true" : undefined;
        const smokeFilter = smoke !== undefined ? smoke === "true" : undefined;
        const vegFilter = veg !== undefined ? veg === "true" : undefined;
        const petsFilter = pets !== undefined ? pets === "true" : undefined;

        // **Apply filters based on user-specified parameters**
        if (Object.keys(req.query).length > 0) {
            scoredResults = scoredResults.filter(flatmate => {
                if (locality !== undefined && flatmate.locality !== locality) return false;
                if (genderFilter !== undefined && flatmate.gender !== genderFilter) return false;
                if (smokeFilter !== undefined && flatmate.smoke !== smokeFilter) return false;
                if (vegFilter !== undefined && flatmate.veg !== vegFilter) return false;
                if (petsFilter !== undefined && flatmate.pets !== petsFilter) return false;
                return true;
            });
        }

        return res.status(200).json({
            success: true,
            message: `Found ${scoredResults.length} matching tenants`,
            data: scoredResults
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// Searching Properties

router.get('/SearchProperties', async (req, res) => {
    const { town, min_price, max_price, min_area, max_area, bhk, ...filters } = req.query; // Extract filters from request body

    if (!town) {
        return res.status(400).json({ error: "Town is required in the request body" });
    }

    try {
        // Get town data (including sorted nearest towns)
        const townData = await Towns.findOne({ name: town });
        if (!townData) return res.status(404).json({ error: "Town not found" });

        // Ensure nearest_towns is an array and extract only the first two nearest towns
        const nearestTowns = Array.isArray(townData?.nearest_towns) ? townData.nearest_towns.slice(0, 2) : [];
        const queryTowns = [town, ...nearestTowns];

        // Construct the filter query
        let query = { town: { $in: queryTowns } };

        // Add price range filtering
        if (min_price || max_price) {
            query.price = {};
            if (min_price) query.price.$gte = Number(min_price);
            if (max_price) query.price.$lte = Number(max_price);
        }

        // Add area range filtering
        if (min_area || max_area) {
            query.area = {};
            if (min_area) query.area.$gte = Number(min_area);
            if (max_area) query.area.$lte = Number(max_area);
        }

        // Handle BHK filtering
        if (bhk) {
            if (bhk.includes(',')) {
                // Convert all selections to numbers (except "more")
                const selectedBhks = bhk.split(',');

                // Handle case where more is included
                if (selectedBhks.includes('more')) {
                    const numericBhks = selectedBhks
                        .filter(val => val !== 'more')
                        .map(Number)
                        .filter(val => !isNaN(val));

                    // Use $or to handle both specific BHKs and "more than 3"
                    query.$or = [
                        { bhk: { $in: numericBhks } },  // Match only the exact BHK values selected
                        { bhk: { $gt: 3 } }            // For the "more" option
                    ];
                } else {
                    // Only include exact matches - no range searching
                    const numericBhks = selectedBhks.map(Number).filter(val => !isNaN(val));
                    query.bhk = { $in: numericBhks };
                }
            } else if (bhk === "more") {
                query.bhk = { $gt: 3 };
            } else {
                const bhkNumber = Number(bhk);
                if (!isNaN(bhkNumber)) query.bhk = bhkNumber;
            }
        }
        // Add other dynamic filters
        Object.keys(filters).forEach(key => {
            if (filters[key] !== undefined && filters[key] !== "") {
                query[key] = isNaN(filters[key]) ? filters[key] : Number(filters[key]);
            }
        });

        // Add this before executing the Property.find query
        console.log("BHK query:", JSON.stringify(query.bhk));
        console.log("Full query:", JSON.stringify(query));

        // Fetch properties with filtering
        const properties = await Property.find(query).lean();

        // Preserve sorting order based on queryTowns
        const sortedProperties = properties.sort((a, b) => {
            return queryTowns.indexOf(a.town) - queryTowns.indexOf(b.town);
        });

        res.json(sortedProperties);
        // console.log(sortedProperties)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;