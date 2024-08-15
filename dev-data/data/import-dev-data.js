const mongoose = require(`mongoose`);
const dotenv = require(`dotenv`);
const fs = require(`fs`);
const Tour = require(`./../../Models/tourModel`);
const User = require(`./../../Models/userModel`);
const Review = require(`./../../Models/reviewModel`);
dotenv.config({ path: `./../../config.env` });

//////////Connecting to MongoDB//////////
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

//connect method returns a promise
mongoose.connect(DB, {}).then((con) => {
  console.log('DB connection successful');
});
////////Read JSON file////////
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, `utf-8`));
const users = JSON.parse(fs.readFileSync(`${__dirname}/user1.json`, `utf-8`));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, `utf-8`),
);

////////Import data into DB////////
const importData = async () => {
  try {
    // await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false }); //we are turning off the validation for passwordConfirm field and we also disabled the password encryption
    // await Review.create(reviews);
    console.log(`Data successfully loaded`);
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

////////Delete all data from DB////////
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    // await User.deleteMany();
    // await Review.deleteMany();
    console.log(`Data successfully deleted`);
  } catch (error) {
    console.log(error);
  }
  process.exit();
};

if (process.argv[2] === `--import`) {
  importData();
} else if (process.argv[2] === `--delete`) {
  deleteData();
}
console.log(process.argv);

//to execute this file and import data: node import-dev-data.js --import
//to execute this file and delete data: node import-dev-data.js --delete
