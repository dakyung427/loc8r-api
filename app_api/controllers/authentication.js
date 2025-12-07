const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

// 회원가입(register) 컨트롤러
const register = async function(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const user = new User();
    user.name = name;
    user.email = email;
    user.setPassword(password);

    await user.save();

    const token = user.generateJwt();
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ message: 'Error registering user', error: err });
  }
};

// 로그인(login) 컨트롤러
const login = function(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return res.status(500).json({ message: 'Error during authentication', error: err });
    }

    if (user) {
      const token = user.generateJwt();
      return res.status(200).json({ token });
    } else {
      return res.status(401).json(info);
    }
  })(req, res);
};

// 모듈 내보내기
module.exports = {
  register,
  login
};