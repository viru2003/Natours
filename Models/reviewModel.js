const mongoose = require("mongoose");
const Tour = require("./tourModel");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour:
      //parent referencing
      {
        type: mongoose.Schema.ObjectId,
        ref: "Tour",
        required: [true, "Review must belong to a tour"],
      },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },
  },
  {
    toJSON: { virtuals: true }, //this will show the virtual properties in the output
    toObject: { virtuals: true },
  },
);

//preventing duplicate reviews
reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); //this will make sure that a user can only review a tour once

/////////Populating Reviews//////
reviewSchema.pre(/^find/, function (next) {
  //parent referencing
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//changes in rating when a review is created
reviewSchema.post(`save`, function () {
  //this points to the current review
  this.constructor.calcAverageRatings(this.tour);
});

//changes in rating when a review is updated or deleted
//findByIdAndUpdate
//findByIdAndDelete
reviewSchema.post(/^findOneAnd/, async function (doc) {
  // console.log(doc);//this will contain review document
  await doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
/*
Virtual populate: We can use this to populate the reviews in the tour model
we will get access to the reviews of a tour without actually persisting the data in the database
*/
