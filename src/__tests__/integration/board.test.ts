import request from 'supertest';
import app from '../../index';
import { cleanDatabase } from '../helpers/testDb';
import { createTestUser, createTestBoard, generateTestToken } from '../helpers/testFactories';
import type { User, Board } from '../../db/schema';

describe('Board Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
  });

  describe('GET /api/boards - Get All Boards', () => {
    let user: User;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
    });

    it('should get empty boards list for new user', async () => {
      const response = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('boards', []);
      expect(response.body).toHaveProperty('count', 0);
      expect(response.body).toHaveProperty('message', 'Ще не створено жодної дошки');
    });

    it('should get all boards for authenticated user', async () => {
      // Create test boards
      const board1 = await createTestBoard(user.id, { title: 'Board 1' });
      const board2 = await createTestBoard(user.id, { title: 'Board 2' });

      const response = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('count', 2);
      expect(response.body.boards).toHaveLength(2);
      expect(response.body.boards).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: board1.id,
            title: 'Board 1',
            ownerId: user.id,
          }),
          expect.objectContaining({
            id: board2.id,
            title: 'Board 2',
            ownerId: user.id,
          }),
        ])
      );
    });

    it('should only return boards owned by authenticated user', async () => {
      // Create board for first user
      await createTestBoard(user.id, { title: 'My Board' });

      // Create another user with their own board
      const otherUser = await createTestUser({ email: 'other@example.com' });
      await createTestBoard(otherUser.id, { title: 'Other Board' });

      const response = await request(app)
        .get('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.boards[0]).toMatchObject({
        title: 'My Board',
        ownerId: user.id,
      });
    });

    it('should fail without authorization header', async () => {
      const response = await request(app)
        .get('/api/boards')
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/boards')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('GET /api/boards/:id - Get Board by ID', () => {
    let user: User;
    let board: Board;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Test Board' });
    });

    it('should get board by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.board).toMatchObject({
        id: board.id,
        title: 'Test Board',
        ownerId: user.id,
      });
      expect(response.body.board).toHaveProperty('createdAt');
      expect(response.body.board).toHaveProperty('updatedAt');
    });

    it('should fail to get board that does not exist', async () => {
      const response = await request(app)
        .get('/api/boards/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Board not found or you do not have access');
    });

    it('should fail to get board owned by another user', async () => {
      // Create another user and their board
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });

      const response = await request(app)
        .get(`/api/boards/${otherBoard.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Board not found or you do not have access');
    });

    it('should fail with invalid board ID', async () => {
      const response = await request(app)
        .get('/api/boards/invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toBe('Invalid board ID');
    });

    it('should fail without authorization', async () => {
      const response = await request(app)
        .get(`/api/boards/${board.id}`)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('POST /api/boards - Create Board', () => {
    let user: User;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
    });

    it('should create a new board successfully', async () => {
      const boardData = {
        title: 'My New Board',
      };

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .send(boardData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Board created successfully');
      expect(response.body.board).toMatchObject({
        title: 'My New Board',
        ownerId: user.id,
      });
      expect(response.body.board).toHaveProperty('id');
      expect(response.body.board).toHaveProperty('createdAt');
      expect(response.body.board).toHaveProperty('updatedAt');
    });

    it('should fail with empty title', async () => {
      const boardData = {
        title: '',
      };

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .send(boardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Invalid input data');
    });

    it('should fail with missing title', async () => {
      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with title longer than 100 characters', async () => {
      const boardData = {
        title: 'a'.repeat(101),
      };

      const response = await request(app)
        .post('/api/boards')
        .set('Authorization', `Bearer ${token}`)
        .send(boardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail without authorization', async () => {
      const boardData = {
        title: 'Test Board',
      };

      const response = await request(app)
        .post('/api/boards')
        .send(boardData)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('PUT /api/boards/:id - Update Board', () => {
    let user: User;
    let board: Board;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Original Title' });
    });

    it('should update board successfully', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Board updated successfully');
      expect(response.body.board).toMatchObject({
        id: board.id,
        title: 'Updated Title',
        ownerId: user.id,
      });
      expect(response.body.board).toHaveProperty('updatedAt');
    });

    it('should fail to update non-existent board', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put('/api/boards/99999')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404);

      expect(response.body.message).toBe('Board not found or you do not have permission');
    });

    it('should fail to update board owned by another user', async () => {
      // Create another user and their board
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });

      const updateData = {
        title: 'Hacked Title',
      };

      const response = await request(app)
        .put(`/api/boards/${otherBoard.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404);

      expect(response.body.message).toBe('Board not found or you do not have permission');
    });

    it('should fail with empty title', async () => {
      const updateData = {
        title: '',
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with invalid board ID', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put('/api/boards/invalid')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toBe('Invalid board ID');
    });

    it('should fail without authorization', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/boards/${board.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('DELETE /api/boards/:id - Delete Board', () => {
    let user: User;
    let board: Board;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Board to Delete' });
    });

    it('should delete board successfully', async () => {
      const response = await request(app)
        .delete(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Board deleted successfully');

      // Verify board is deleted
      const getResponse = await request(app)
        .get(`/api/boards/${board.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(getResponse.body.message).toBe('Board not found or you do not have access');
    });

    it('should fail to delete non-existent board', async () => {
      const response = await request(app)
        .delete('/api/boards/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Board not found or you do not have permission');
    });

    it('should fail to delete board owned by another user', async () => {
      // Create another user and their board
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });

      const response = await request(app)
        .delete(`/api/boards/${otherBoard.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Board not found or you do not have permission');
    });

    it('should fail with invalid board ID', async () => {
      const response = await request(app)
        .delete('/api/boards/invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toBe('Invalid board ID');
    });

    it('should fail without authorization', async () => {
      const response = await request(app)
        .delete(`/api/boards/${board.id}`)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });
});

