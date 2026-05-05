const express = require("express");
const StudyRoom = require("../models/StudyRoom");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const rooms = await StudyRoom.find({}).limit(20);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, ambientSettings } = req.body;
    const room = await StudyRoom.create({
      name,
      createdBy: req.auth.sub,
      members: [req.auth.sub],
      ambientSettings: ambientSettings || "default"
    });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

router.post("/:roomId/join", requireAuth, async (req, res, next) => {
  try {
    const room = await StudyRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    
    if (!room.members.includes(req.auth.sub)) {
      room.members.push(req.auth.sub);
      await room.save();
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
