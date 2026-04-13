const prisma = require("../lib/prisma");
const { body, validationResult } = require("express-validator");

const validateComment = [
  body("text")
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be between 1 and 500 characters.")
];

async function createComment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { text } = req.body;
  const { postId } = req.params;

  try {
    const comment = await prisma.comment.create({
      data: {
        text,
        userId: req.user.id, // From JWT
        postId: parseInt(postId)
      }
    });
    res.json(comment);
  } catch (err) {
    res.status(500).json({ error: "Failed to post comment" });
  }
}

async function getCommentsByPost(req, res) {
  const { postId } = req.params;

  try {
    const comments = await prisma.comment.findMany({
      where: { postId: parseInt(postId) },
      include: {
        user: {
          select: { username: true } // Only get the username for privacy
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch comments" });
  }
}

async function updateComment(req, res) {
  const { commentId } = req.params;
  const { text } = req.body;

  try {
    const updatedComment = await prisma.comment.update({
      where: { 
        id: parseInt(commentId),
        userId: req.user.id // Security: Ensures only the owner can edit
      },
      data: { text }
    });
    res.json(updatedComment);
  } catch (err) {
    res.status(403).json({ error: "Unauthorized or comment not found" });
  }
}

async function deleteComment(req, res) {
  const { commentId } = req.params;

  try {
    // 1. Find the comment AND the post it belongs to
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: { post: true } 
    });

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // 2. Check Permissions
    const isCommentOwner = comment.userId === req.user.id;
    const isPostAuthor = comment.post.authorId === req.user.id;

    if (isCommentOwner || isPostAuthor) {
      await prisma.comment.delete({ where: { id: parseInt(commentId) } });
      return res.json({ message: "Comment deleted" });
    }

    res.status(403).json({ message: "Unauthorized to delete this comment" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" });
  }
}

module.exports = {
  validateComment,
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment
}