import messageModel from "./models/message.model.js"

export default class Messages {
  constructor() { }

  getMessages = async () => messageModel.find().lean().exec()
  createMessage = async (user, message) => messageModel.create({ user, message })
}