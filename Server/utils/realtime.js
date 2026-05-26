const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const UserModel = require("../models/user");

let io;

const userRoom = (userId) => `user:${userId}`;
const requestRoom = (requestId) => `request:${requestId}`;

const initRealtime = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Not authorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.id).select("_id role isActive");
      if (!user || !user.isActive) return next(new Error("Not authorized"));

      socket.user = user;
      return next();
    } catch (err) {
      return next(new Error("Not authorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.user._id));

    socket.on("request:join", (requestId) => {
      if (requestId) socket.join(requestRoom(requestId));
    });

    socket.on("disconnect", () => {});
  });

  return io;
};

const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(userRoom(userId)).emit(event, payload);
};

const emitToRequest = (requestId, event, payload) => {
  if (io && requestId) io.to(requestRoom(requestId)).emit(event, payload);
};

module.exports = {
  initRealtime,
  emitToUser,
  emitToRequest,
};
