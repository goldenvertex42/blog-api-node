const prisma = require("../lib/prisma.js");
const { body, validationResult } = require("express-validator");

const validatePost = [
  body("title")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Title is required"),
  body("text")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Post content cannot be empty")
];

async function createPost(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const post = await prisma.post.create({
      data: {
        title: req.body.title,
        text: req.body.text,
        published: req.body.published || false, // Default to draft
        authorId: req.user.id
      }
    });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
}

async function getPostById(req, res) {
  const { postId } = req.params;
  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) },
      include: {
        author: { select: { username: true } },
        comments: {
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Error fetching post" });
  }
}

async function getPublishedPosts(req, res) {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      include: {
        author: {
          select: { username: true }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
}

async function getAdminPosts(req, res) {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { comments: true }
        }
      }
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin posts" });
  }
}

async function updatePost(req, res) {
  const { postId } = req.params;
  const { title, text, published } = req.body;

  try {
    const updatedPost = await prisma.post.update({
      where: { 
        id: parseInt(postId),
        authorId: req.user.id // Ensure you can only edit YOUR posts
      },
      data: { title, text, published }
    });
    res.json(updatedPost);
  } catch (err) {
    res.status(500).json({ error: "Failed to update post" });
  }
}


const togglePublish = async (req, res) => {
  try {
    const { published } = req.body;
    const { postId } = req.params;

    const post = await prisma.post.update({
      where: { id: parseInt(postId) },
      data: { published: Boolean(published) },
    });

    res.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "Failed to update post" });
  }
};


async function deletePost(req, res) {
  const { postId } = req.params;

  try {
    // deleteMany allows us to use a 'where' clause that checks BOTH id and authorId
    const deleteOp = await prisma.post.deleteMany({
      where: {
        id: parseInt(postId),
        authorId: req.user.id, // Enforces that you can only delete YOUR post
      },
    });

    if (deleteOp.count === 0) {
      return res.status(404).json({ message: "Post not found or unauthorized" });
    }

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
}

module.exports = {
  validatePost,
  createPost,
  getPostById,
  getPublishedPosts,
  getAdminPosts,
  updatePost,
  togglePublish,
  deletePost
}