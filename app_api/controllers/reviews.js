// reviews.controller.js
const mongoose = require('mongoose');
const Loc = mongoose.model('Location');
const User = mongoose.model('User');

/**
 * Author 가져오기 (Promise 기반)
 */
const getAuthor = (req) => {
  return new Promise((resolve, reject) => {
    if (!req.payload || !req.payload.email) {
      reject({ status: 401, message: 'Unauthorized' });
    } else {
      User.findOne({ email: req.payload.email }).exec((err, user) => {
        if (!user) {
          reject({ status: 404, message: 'User not found' });
        } else if (err) {
          reject({ status: 400, message: err });
        } else {
          resolve(user.name);
        }
      });
    }
  });
};

/**
 * 평균 평점 계산
 */
const doSetAverageRating = async (location) => {
  if (location.reviews && location.reviews.length > 0) {
    const count = location.reviews.length;
    const total = location.reviews.reduce((acc, { rating }) => acc + rating, 0);
    location.rating = parseInt(total / count, 10);
    try {
      await location.save();
      console.log(`Average rating updated to ${location.rating}`);
    } catch (err) {
      console.log(err);
    }
  }
};

/**
 * 리뷰 추가
 */
const doAddReview = async (req, res, location, author) => {
  if (!location) {
    return res.status(404).json({ message: 'Location not found' });
  }

  const { rating, reviewText } = req.body;

  location.reviews.push({
    author,
    rating,
    reviewText
  });

  try {
    const savedLocation = await location.save();
    await doSetAverageRating(savedLocation);
    const thisReview = savedLocation.reviews.slice(-1).pop();
    return res.status(201).json(thisReview);
  } catch (err) {
    return res.status(400).json(err);
  }
};

/**
 * 리뷰 생성
 */
const reviewsCreate = async (req, res) => {
  const locationId = req.params.locationid;
  if (!locationId) {
    return res.status(404).json({ message: 'Location not found' });
  }

  try {
    const userName = await getAuthor(req);
    const location = await Loc.findById(locationId).select('reviews').exec();
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    await doAddReview(req, res, location, userName);
  } catch (err) {
    return res.status(err.status || 400).json({ message: err.message || err });
  }
};

/**
 * 리뷰 단일 조회
 */
const reviewsReadOne = async (req, res) => {
  try {
    const location = await Loc.findById(req.params.locationid)
      .select('name reviews')
      .exec();

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    if (!location.reviews || location.reviews.length === 0) {
      return res.status(404).json({ message: 'No reviews found' });
    }

    const review = location.reviews.id(req.params.reviewid);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const response = {
      location: {
        name: location.name,
        id: req.params.locationid
      },
      review
    };

    return res.status(200).json(response);
  } catch (err) {
    return res.status(400).json(err);
  }
};

/**
 * 리뷰 업데이트
 */
const reviewsUpdateOne = async (req, res) => {
  const { locationid, reviewid } = req.params;
  if (!locationid || !reviewid) {
    return res.status(404).json({ message: 'locationid and reviewid are required' });
  }

  try {
    const location = await Loc.findById(locationid).select('reviews').exec();
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const thisReview = location.reviews.id(reviewid);
    if (!thisReview) {
      return res.status(404).json({ message: 'Review not found' });
    }

    thisReview.author = req.body.author;
    thisReview.rating = req.body.rating;
    thisReview.reviewText = req.body.reviewText;

    const updatedLocation = await location.save();
    await doSetAverageRating(updatedLocation);

    return res.status(200).json(thisReview);
  } catch (err) {
    return res.status(400).json(err);
  }
};

/**
 * 리뷰 삭제
 */
const reviewsDeleteOne = async (req, res) => {
  const { locationid, reviewid } = req.params;
  if (!locationid || !reviewid) {
    return res.status(404).json({ message: 'locationid and reviewid are required' });
  }

  try {
    const location = await Loc.findById(locationid).select('reviews').exec();
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const review = location.reviews.id(reviewid);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.remove();
    const savedLocation = await location.save();
    await doSetAverageRating(savedLocation);

    return res.status(204).json(null);
  } catch (err) {
    return res.status(400).json(err);
  }
};

module.exports = {
  reviewsCreate,
  reviewsReadOne,
  reviewsUpdateOne,
  reviewsDeleteOne
};
