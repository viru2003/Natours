const Tour = require("./../Models/tourModel");

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = "5";
  req.query.sort = "price,-ratingsAverage";
  req.query.fields = "name,price,ratingsAverage,summary,difficulty";
  next();
};

////////////Handlers//////////
exports.getALLTours = async (req, res) => {
  try {
    ///////Queries///////
    // 127.0.0.1:3000/api/v1/tours?difficulty=easy&page=5&limit=18&sort=1&duration=5
    // 127.0.0.1:3000/api/v1/t7ours?difficulty=easy&page=5&limit=18&sort=1&duration[gte]=5 ,gte = greater than or equal to
    // 127.0.0.1:3000/api/v1/tours?sort=-price
    // 127.0.0.1:3000/api/v1/tours?sort=price,ratingsAverage

    //////1.A FILTERING
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    //////1.B ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // console.log(req.query, queryObj);
    // console.log(queryStr);

    //////BUILDING THE QUERY
    let query = Tour.find(JSON.parse(queryStr));

    ///////2. SORTING
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
      //sort('price ratingsAverage')
    } else {
      query = query.sort("-createdAt");
    }

    ///////3. FIELD LIMITING
    //127.0.0.1:3000/api/v1/tours?fields=name,duration,difficulty,price
    if (req.query.fields) {
      // console.log(req.query.fields);
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v"); //excluding the __v field
    }

    ///////4. PAGINATION/////
    //to return particular page and limit the number of documents per page
    //page=2&limit=10, 1-10 page 1, 11-20 page 2, 21-30 page 3
    //127.0.0.1:3000/api/v1/tours?page=1&limit=5
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 100;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
    if (req.query.page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error("This page does not exist");
    }

    //////////EXECUTING THE QUERY
    const tours = await query;

    //////SENDING THE RESPONSE
    res.status(200).json({
      status: "success",
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: "fail",
      message: error,
    });
  }
};

exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    //Tour.findOne({_id: req.params.id}})
    res.status(200).json({
      status: "success",
      data: {
        tour,
      },
    });
  } catch (error) {
    res.status(404).json({
      status: "fail",
      message: error,
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    // const newTour = new Tour(req.body);
    // const doc = await newTour.save();

    const newTour = await Tour.create(req.body); //this will return a promise containing the new document

    res.status(201).json({
      status: "success",
      data: {
        tour: newTour,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: "Invalid data sent!",
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //this will return the new updated document
      runValidators: true, //this will run the validators again
    });

    res.status(200).json({ status: "Success", data: { tour } });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: "Success", data: null });
  } catch (error) {
    res.status(400).json({ status: "fail", message: error });
  }
};
