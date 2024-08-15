const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");
const User = require("./userModel");
// const Review = require("./reviewModel");

//////////Creating a Schema//////////
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"], //validator
      unique: true,
      trim: true,
      maxlength: [40, "A tour must have less or equal than 40 characters"],
      minlength: [10, "A tour must have more or equal than 10 characters"],
      // validate: [validator.isAlpha, "Tour must only contain characters"], //validator package
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either: easy,medium,difficult",
      },
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10, //this will round off the value to 1 decimal place
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        //this will only work on new document creation and not on update
        validator: function (val) {
          return this.price > val;
        },
        message: `Discount price ({VALUE}) should be below regular price`,
      },
    },
    summary: {
      type: String,
      required: [true, "A tour must have a summary"],
      trim: true, //this will remove all the white spaces in the beginning and end of the string
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, //this will not show the createdAt field in the output,used to hide sensitive data
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      //GeoJSON
      types: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number], //longitude and latitude
      address: String,
      description: String,
    },
    //this will a store document inside parent document
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number], //longitude and latitude
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User", //reference to the User model
      },
    ],
    // guides: Array,embedding
  },
  {
    toJSON: { virtuals: true }, //this will show the virtual properties in the output
    toObject: { virtuals: true },
  },
);

//everything that is not the schema will be ignored

tourSchema.virtual(`durationWeeks`).get(function () {
  return this.duration / 7;
}); //this will be called everytime we get data from the database
//original function is used because we need this keyword,which points to the current document.

//////////Indexing//////////
tourSchema.index({ price: 1, ratingsAverage: -1 });
//not used when write to read ratio is high
//this will create an index on the price field in ascending order
//this will work only for queries that start with price field
tourSchema.index({ slug: 1 });
tourSchema.index({ "startLocation.coordinates": "2dsphere" }); //this is needed for geospatial queries

/////Virtual Populate/////
tourSchema.virtual(`reviews`, {
  ref: `Review`, //reference to the Review model
  foreignField: `tour`, //field in other model where the reference to the current model is stored
  localField: `_id`, //field in current model where the reference is stored
});

//////////Document Middleware////////// runs before and after .save() and .create() but on not on .insertMany()
//pre save hook
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//retrieve the guides from the users collection and embed them into the tour document
/*tourSchema.pre("save", async function (next) {
  const guidesPromises = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromises);
  next();
});*/

//post save hook
tourSchema.post("save", function (doc, next) {
  // console.log(doc);
  next();
});

//////////Query Middleware////////// runs before and after query .find() and .findOne()
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt", //this will exclude the fields from the output
  });
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

//////////Aggregation Middleware////////// runs before and after aggregation .aggregate()
tourSchema.pre("aggregate", function (next) {
  if (!this.pipeline().some((el) => el.hasOwnProperty("$geoNear"))) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }
  next();
});

//////////Creating a Model//////////
const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;

/*
Mongoose Middleware:It is a function that runs before or after certain events.
There are 4 types of middleware in mongoose:
1.Document Middleware->act on the currently processed document
2.Query Middleware
3.Aggregate Middleware
4.Model Middleware
*/

/*
Virtual Properties:This are the fields that we define in our schema which will not be saved into the database in order to save space.
This can be derived from the existing fields in the database.
*/
