const request = require("supertest");
const app = require("../../app");
const prisma = require("../../lib/prisma");
const bcrypt = require('bcryptjs');

let token;
let testUser;

beforeAll(async () => {
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  const hashedPassword = await bcrypt.hash("password123", 10);
  testUser = await prisma.user.create({
    data: { firstName: "Denver", lastName: "Clark", username: "denver", password: hashedPassword, email: "d@test.com", isAuthor: true }
  });

  const loginResponse = await request(app)
    .post("/auth/login")
    .send({ email: "d@test.com", password: "password123" });
  token = loginResponse.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Post Routes Integration", () => {

  describe("GET /posts", () => {
    it("should return only published posts with author info", async () => {
      await prisma.post.createMany({
        data: [
          { title: "Published", text: "Visible", published: true, authorId: testUser.id },
          { title: "Draft", text: "Hidden", published: false, authorId: testUser.id }
        ]
      });

      const res = await request(app).get("/posts");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe("Published");
      expect(res.body[0].author).toHaveProperty("username");
    });
  });

  describe("POST /posts", () => {
    it("should block post creation without a valid JWT", async () => {
      const res = await request(app).post("/posts").send({ title: "Fail", text: "Fail" });
      expect(res.status).toBe(401);
    });

    it("should return 400 if title is missing (express-validator check)", async () => {
      const res = await request(app)
        .post("/posts")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "", text: "Some content" });

      expect(res.status).toBe(400);
      expect(res.body.errors[0].msg).toBe("Title is required");
    });
  });

  describe("GET /posts/:postId", () => {
    it("should return post details, author, and comments", async () => {
      const post = await prisma.post.create({
        data: { title: "Detail Post", text: "Content", authorId: testUser.id }
      });

      const res = await request(app).get(`/posts/${post.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("comments");
      expect(res.body.author.username).toBe("denver");
    });
  });

  describe("DELETE /posts/:postId", () => {
    it("should return 404 if the user tries to delete a post they don't own", async () => {
      const otherUser = await prisma.user.create({ data: { firstName: "Other", lastName: "User", username: "other", email: "o@o.com", password: "123", isAuthor: true } });
      const otherPost = await prisma.post.create({
        data: { title: "Not Mine", text: "Content", authorId: otherUser.id }
      });

      const res = await request(app)
        .delete(`/posts/${otherPost.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
