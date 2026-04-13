const { Router } = require("express");
const postRouter = Router();
const postController = require("../controllers/postController");
const commentController = require("../controllers/commentController");
const passport = require("passport");

const checkAuthor = (req, res, next) => {
  if (req.user && req.user.isAuthor) {
    return next();
  }
  return res.status(403).json({ message: "Access denied: Authors only." });
};

postRouter.get("/", postController.getPublishedPosts);
postRouter.get("/admin", passport.authenticate("jwt", { session: false }), postController.getAdminPosts);

postRouter.post(
  "/", 
  passport.authenticate("jwt", { session: false }), 
  checkAuthor, 
  postController.validatePost, 
  postController.createPost
);

postRouter.get("/:postId", postController.getPostById);

postRouter.put(
  "/:postId",
  passport.authenticate("jwt", { session: false }),
  checkAuthor,
  postController.validatePost,
  postController.updatePost
);

postRouter.delete(
  "/:postId", 
  passport.authenticate("jwt", { session: false }), 
  checkAuthor, 
  postController.deletePost
);

postRouter.get("/:postId/comments", commentController.getCommentsByPost);

postRouter.post(
  "/:postId/comments", 
  passport.authenticate("jwt", { session: false }), 
  commentController.validateComment, 
  commentController.createComment
);

postRouter.put(
  "/comments/:commentId",
  passport.authenticate("jwt", { session: false }),
  commentController.validateComment,
  commentController.updateComment
);

postRouter.delete(
  "/comments/:commentId",
  passport.authenticate("jwt", { session: false }), 
  commentController.deleteComment
);

module.exports = postRouter;