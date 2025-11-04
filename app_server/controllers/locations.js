var request = require('request');

const apiOptions = {
    server: 'http://localhost:3000'
};

if (process.env.NODE_ENV === 'production') {
    apiOptions.server = 'https://yourapi.com';
}

// ------------------------
// 재사용 가능한 API 호출 함수
// ------------------------
const getLocationInfo = (req, res, callback) => {
    const path = `/api/locations/${req.params.locationid}`;
    const requestOptions = {
        url: `${apiOptions.server}${path}`,
        method: 'GET',
        json: true
    };

    request(requestOptions, (err, response, body) => {
        if (err) {
            console.log(err);
            showError(req, res, 500);
            return;
        }

        const statusCode = response.statusCode;
        let data = body;

        if (statusCode === 200) {
            // GeoJSON 좌표를 Google Maps 객체 형태로 변환
            if (data.coords && Array.isArray(data.coords.coordinates)) {
                data.coords = {
                    lat: data.coords.coordinates[1],
                    lng: data.coords.coordinates[0]
                };
            } else {
                data.coords = { lat: 0, lng: 0 };
            }

            callback(req, res, data); // 성공 시 callback 호출
        } else {
            showError(req, res, statusCode);
        }
    });
};

// ------------------------
// 홈페이지 렌더링
// ------------------------
const homelist = (req, res) => {
    const path = '/api/locations';
    const requestOptions = {
        url: `${apiOptions.server}${path}`,
        method: 'GET',
        json: {},
        qs: {
            lng: 127.2635,
            lat: 37.0092,
            maxDistance: 200000
        }
    };

    request(requestOptions, (err, response, body) => {
        if (err) {
            res.send('API 요청 중 오류 발생');
            return;
        }

        let data = [];
        if (response.statusCode === 200 && Array.isArray(body) && body.length) {
            data = body.map(item => {
                item.distance = item.distance ? formatDistance(item.distance) : '0m';
                return item;
            });
        }

        renderHomepage(req, res, data);
    });
};

// 거리 숫자 변환 및 단위 처리
const formatDistance = (distance) => {
    const numericDistance = parseFloat(String(distance).replace(/[^\d.]/g, ''));
    if (isNaN(numericDistance)) return '0m';

    if (numericDistance > 1000) {
        return parseFloat(numericDistance / 1000).toFixed(1) + 'km';
    }
    return Math.floor(numericDistance) + 'm';
};

// 홈페이지 렌더링
const renderHomepage = (req, res, responseBody) => {
    let message = null;

    if (!(responseBody instanceof Array)) {
        message = "API lookup error";
        responseBody = [];
    } else if (!responseBody.length) {
        message = "No places found nearby";
    }

    res.render('locations-list', {
        title: 'Loc8r',
        pageHeader: { title: 'Loc8r', strapline: 'Find places to work with wifi near you!' },
        sidebar: "Looking for wifi and a seat? Loc8r helps you find " +
                 "places to work when out and about. Perhaps with coffee, cake or a pint? " +
                 "Let Loc8r help you find the place you're looking for.",
        locations: responseBody,
        message
    });
};

// ------------------------
// Location info 페이지
// ------------------------
const locationInfo = (req, res) => {
    getLocationInfo(req, res, (req, res, responseData) => {
        renderDetailPage(req, res, responseData);
    });
};

// ------------------------
// Add review 페이지
// ------------------------
const renderReviewForm = (req, res, { name }) => {
    res.render('location-review-form', {
        title: `Review ${name} on Loc8r`,
        pageHeader: { title: `Review ${name}` },
        error: req.query.err
    });
};

const addReview = (req, res) => {
    getLocationInfo(req, res, (req, res, responseData) => {
        renderReviewForm(req, res, responseData);
    });
};

// ------------------------
// POST 리뷰 처리
// ------------------------
const doAddReview = (req, res) => {
    const locationid = req.params.locationid;
    const path = `/api/locations/${locationid}/reviews`;
    const postdata = {
        author: req.body.name,
        rating: parseInt(req.body.rating, 10),
        reviewText: req.body.review
    };

    const requestOptions = {
        url: `${apiOptions.server}${path}`,
        method: 'POST',
        json: postdata
    };

    if (!postdata.author || !postdata.rating || !postdata.reviewText) {
        res.redirect(`/location/${locationid}/review/new?err-val`);
    } else {
        request(requestOptions, (err, { statusCode }, body) => {
            if (statusCode === 201) {
                res.redirect(`/location/${locationid}`);
            } else if (statusCode === 400 && body.name === 'ValidationError') {
                // 유효성 오류 시 다시 폼으로 리다이렉트하고 쿼리 전달
                res.redirect(`/location/${locationid}/review/new?err=val`);
            } else {
                showError(req, res, statusCode);
            }
        });
    }
};


// ------------------------
// 에러 처리
// ------------------------
const showError = (req, res, status) => {
    let title = '';
    let content = '';

    if (status === 404) {
        title = '404, page not found';
        content = 'Oh dear. Looks like you can\'t find this page. Sorry.';
    } else {
        title = `${status}, something's gone wrong`;
        content = 'Something, somewhere, has gone just a little bit wrong.';
    }

    res.status(status);
    res.render('generic-text', { title, content });
};

// Location info 렌더링
const renderDetailPage = (req, res, location) => {
    res.render('location-info', {
        title: location.name,
        pageHeader: { title: location.name },
        sidebar: {},
        context: 'is on Loc8r because it has accessible wifi and space to sit down with your laptop and get some work done.',
        callToAction: "If you've been and you like it - or if you don't please leave a review to help other people just like you.",
        location
    });
};

module.exports = {
    homelist,
    locationInfo,
    addReview,
    doAddReview
};
