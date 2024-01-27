import passport from "passport"
import local from "passport-local"
import GithubStrategy from "passport-github2"
import UserModel from "../DAO/mongo/models/user.models.js"
 import passportJWT from "passport-jwt"
import { isValidPassword, createHash, jwtSign, generateToken } from "../utils.js"
import CartModel from "../DAO/mongo/models/carts.model.js"

const LocalStrategy = local.Strategy
const JWTStrategy = passportJWT.Strategy

const initializePassport = () => {

  passport.use("register", new LocalStrategy({
    passReqToCallback: true,
    usernameField: "email"
  }, async (req, username, password, done) => {
    const { first_name, last_name, email, age, role } = req.body
    try {
      const user = await UserModel.findOne({ email: username })
      if (user) {
        console.log("User already exists")
        return done(null, false)
      }
      const carts = await CartModel.find()

      const newUser = {
        first_name,
        last_name,
        email,
        age,
        role,
        cart: carts[0]._id,
        password: createHash(password)
      }

      const result = await UserModel.create(newUser)
      return done(null, result)
    }
    catch (e) {
      return done("Errorr: " + e)
    }
  }))

  passport.use("login", new LocalStrategy({
    usernameField: "email"
  }, async (username, password, done) => {
    try {
      const user = await UserModel.findOne({email: username}).lean().exec()

      if (!user) {
        console.log("User doesn't exists")
        return done(null, false)
      }

      if (!isValidPassword(user, password)) {
        console.log("Incorrect password")
        return done(null, false)
      }

      const token = generateToken(user)
      user.token = token

      return done(null, user)
    }
    catch(e) {
      return done("Error: "+e)
    }
  }))

  passport.use("github", new GithubStrategy({
    clientID: "Iv1.920884a55092deb0",
    clientSecret: "a94ad48a2bde6e32bc01d05c05d7b49e4cef5459",
    callbackURL: "http://127.0.0.1:8080/api/session/githubcallback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await UserModel.findOne({email: profile._json.email})
      if (!user) {
        console.log("User doesn't exists, pass to register")
        
        const carts = await CartModel.find()
        user = await UserModel.create({
          first_name: profile._json.name,
          last_name: "",
          email: profile._json.email,
          age: null,
          password: "",
          cart: carts[0]._id,
          role: profile._json.email == "adminCoder@coder.com" ? "admin" : "user"
        })
      }
      const token = generateToken(user)
      user.token = token

      return done(null, user)
    }
    catch(e) {
      return done("Error: "+e)
    }
  }))

  passport.use("jwt", new JWTStrategy({
    jwtFromRequest: passportJWT.ExtractJwt.fromExtractors([req => req?.cookies?.jwtCookie ?? null]),
    secretOrKey: jwtSign
  },(payload, done) => {
    done(null, payload)
  }))

  passport.serializeUser((user, done) => {
    done(null, user._id)
  })

  passport.deserializeUser(async (id, done) => {
    const user = await UserModel.findById(id).lean().exec()
    done(null, user)
  })
}

export default initializePassport