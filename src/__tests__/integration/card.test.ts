import request from 'supertest';
import app from '../../index';
import { cleanDatabase, closeDbConnection } from '../helpers/testDb';
import { createTestUser, createTestBoard, createTestList, createTestCard, generateTestToken } from '../helpers/testFactories';
import type { User, Board, List, Card } from '../../db/schema';

describe('Card Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await closeDbConnection();
  });

  describe('GET /api/cards/list/:listId - Get All Cards for List', () => {
    let user: User;
    let board: Board;
    let list: List;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Test Board' });
      list = await createTestList(board.id, { title: 'Test List', position: 0 });
    });

    it('should get empty cards array for list with no cards', async () => {
      const response = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('cards', []);
      expect(response.body).toHaveProperty('count', 0);
    });

    it('should get all cards for a list ordered by position', async () => {
      // Create test cards
      const card1 = await createTestCard(list.id, { title: 'Card 1', position: 0 });
      const card2 = await createTestCard(list.id, { title: 'Card 2', position: 1, description: 'Test description' });
      const card3 = await createTestCard(list.id, { title: 'Card 3', position: 2 });

      const response = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBe(3);
      expect(response.body.cards).toHaveLength(3);
      expect(response.body.cards[0]).toMatchObject({
        id: card1.id,
        title: 'Card 1',
        position: 0,
        listId: list.id,
      });
      expect(response.body.cards[1]).toMatchObject({
        id: card2.id,
        title: 'Card 2',
        description: 'Test description',
        position: 1,
        listId: list.id,
      });
      expect(response.body.cards[2]).toMatchObject({
        id: card3.id,
        title: 'Card 3',
        position: 2,
        listId: list.id,
      });
    });

    it('should only return cards from the specified list', async () => {
      // Create card for first list
      await createTestCard(list.id, { title: 'My Card' });

      // Create another list with its own card
      const otherList = await createTestList(board.id, { title: 'Other List', position: 1 });
      await createTestCard(otherList.id, { title: 'Other Card' });

      const response = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.cards[0]).toMatchObject({
        title: 'My Card',
        listId: list.id,
      });
    });

    it('should fail to get cards from list owned by another user', async () => {
      // Create another user with their own board and list
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });
      const otherList = await createTestList(otherBoard.id, { title: 'Other List' });
      await createTestCard(otherList.id, { title: 'Other Card' });

      const response = await request(app)
        .get(`/api/cards/list/${otherList.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe('You do not have access to this list');
    });

    it('should fail with invalid list ID', async () => {
      const response = await request(app)
        .get('/api/cards/list/invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toBe('Invalid list ID');
    });

    it('should fail without authorization', async () => {
      const response = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('GET /api/cards/:id - Get Card by ID', () => {
    let user: User;
    let board: Board;
    let list: List;
    let card: Card;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Test Board' });
      list = await createTestList(board.id, { title: 'Test List', position: 0 });
      card = await createTestCard(list.id, { title: 'Test Card', description: 'Test description', position: 0 });
    });

    it('should get card by ID successfully', async () => {
      const response = await request(app)
        .get(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.card).toMatchObject({
        id: card.id,
        title: 'Test Card',
        description: 'Test description',
        position: 0,
        listId: list.id,
      });
      expect(response.body.card).toHaveProperty('createdAt');
      expect(response.body.card).toHaveProperty('updatedAt');
    });

    it('should fail to get card that does not exist', async () => {
      const response = await request(app)
        .get('/api/cards/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Card not found');
    });

    it('should fail to get card from list owned by another user', async () => {
      // Create another user and their card
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });
      const otherList = await createTestList(otherBoard.id, { title: 'Other List' });
      const otherCard = await createTestCard(otherList.id, { title: 'Other Card' });

      const response = await request(app)
        .get(`/api/cards/${otherCard.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe('You do not have access to this card');
    });

    it('should fail with invalid card ID', async () => {
      const response = await request(app)
        .get('/api/cards/invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toBe('Invalid card ID');
    });

    it('should fail without authorization', async () => {
      const response = await request(app)
        .get(`/api/cards/${card.id}`)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('POST /api/cards - Create Card', () => {
    let user: User;
    let board: Board;
    let list: List;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Test Board' });
      list = await createTestList(board.id, { title: 'Test List', position: 0 });
    });

    it('should create a new card successfully without position', async () => {
      const cardData = {
        title: 'My New Card',
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Card created successfully');
      expect(response.body.card).toMatchObject({
        title: 'My New Card',
        listId: list.id,
        position: 0,
      });
      expect(response.body.card).toHaveProperty('id');
      expect(response.body.card).toHaveProperty('createdAt');
      expect(response.body.card).toHaveProperty('updatedAt');
    });

    it('should create card with description', async () => {
      const cardData = {
        title: 'Card with Description',
        description: 'This is a detailed description',
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(201);

      expect(response.body.card).toMatchObject({
        title: 'Card with Description',
        description: 'This is a detailed description',
        listId: list.id,
      });
    });

    it('should create card with auto-incremented position', async () => {
      // Create first cards
      await createTestCard(list.id, { title: 'Card 1', position: 0 });
      await createTestCard(list.id, { title: 'Card 2', position: 1 });

      const cardData = {
        title: 'Card 3',
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(201);

      expect(response.body.card.position).toBe(2);
    });

    it('should create card with specific position', async () => {
      const cardData = {
        title: 'My Card',
        listId: list.id,
        position: 5,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(201);

      expect(response.body.card.position).toBe(5);
    });

    it('should shift existing cards when inserting at specific position', async () => {
      // Create initial cards
      await createTestCard(list.id, { title: 'Card 1', position: 0 });
      await createTestCard(list.id, { title: 'Card 2', position: 1 });
      await createTestCard(list.id, { title: 'Card 3', position: 2 });

      const cardData = {
        title: 'Inserted Card',
        listId: list.id,
        position: 1,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(201);

      expect(response.body.card.position).toBe(1);

      // Verify all cards are in correct order
      const cardsResponse = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(cardsResponse.body.cards).toHaveLength(4);
      expect(cardsResponse.body.cards[0].title).toBe('Card 1');
      expect(cardsResponse.body.cards[0].position).toBe(0);
      expect(cardsResponse.body.cards[1].title).toBe('Inserted Card');
      expect(cardsResponse.body.cards[1].position).toBe(1);
      expect(cardsResponse.body.cards[2].title).toBe('Card 2');
      expect(cardsResponse.body.cards[2].position).toBe(2);
      expect(cardsResponse.body.cards[3].title).toBe('Card 3');
      expect(cardsResponse.body.cards[3].position).toBe(3);
    });

    it('should fail to create card in list owned by another user', async () => {
      // Create another user and their list
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });
      const otherList = await createTestList(otherBoard.id, { title: 'Other List' });

      const cardData = {
        title: 'Hacker Card',
        listId: otherList.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(403);

      expect(response.body.message).toBe('You do not have access to this list');
    });

    it('should fail with empty title', async () => {
      const cardData = {
        title: '',
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Invalid input data');
    });

    it('should fail with missing title', async () => {
      const cardData = {
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with missing listId', async () => {
      const cardData = {
        title: 'My Card',
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with title longer than 200 characters', async () => {
      const cardData = {
        title: 'a'.repeat(201),
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with description longer than 2000 characters', async () => {
      const cardData = {
        title: 'My Card',
        description: 'a'.repeat(2001),
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with negative position', async () => {
      const cardData = {
        title: 'My Card',
        listId: list.id,
        position: -1,
      };

      const response = await request(app)
        .post('/api/cards')
        .set('Authorization', `Bearer ${token}`)
        .send(cardData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail without authorization', async () => {
      const cardData = {
        title: 'Test Card',
        listId: list.id,
      };

      const response = await request(app)
        .post('/api/cards')
        .send(cardData)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('PUT /api/cards/:id - Update Card', () => {
    let user: User;
    let board: Board;
    let list: List;
    let card: Card;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Test Board' });
      list = await createTestList(board.id, { title: 'Test List', position: 0 });
      card = await createTestCard(list.id, { title: 'Original Title', description: 'Original description', position: 0 });
    });

    it('should update card title successfully', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Card updated successfully');
      expect(response.body.card).toMatchObject({
        id: card.id,
        title: 'Updated Title',
        description: 'Original description',
        position: 0,
        listId: list.id,
      });
      expect(response.body.card).toHaveProperty('updatedAt');
    });

    it('should update card description successfully', async () => {
      const updateData = {
        description: 'Updated description',
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.card.description).toBe('Updated description');
    });

    it('should clear card description by setting it to null', async () => {
      const updateData = {
        description: null,
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.card.description).toBeNull();
    });

    it('should update card position successfully', async () => {
      const updateData = {
        position: 5,
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.card.position).toBe(5);
    });

    it('should update multiple fields at once', async () => {
      const updateData = {
        title: 'New Title',
        description: 'New description',
        position: 3,
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.card).toMatchObject({
        title: 'New Title',
        description: 'New description',
        position: 3,
      });
    });

    it('should reorder cards when moving position forward', async () => {
      // Create multiple cards
      const card1 = await createTestCard(list.id, { title: 'Card 1', position: 1 });
      const card2 = await createTestCard(list.id, { title: 'Card 2', position: 2 });
      const card3 = await createTestCard(list.id, { title: 'Card 3', position: 3 });

      // Move card from position 0 to position 2
      const updateData = {
        position: 2,
      };

      await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      // Verify all cards are in correct order
      const cardsResponse = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const cards = cardsResponse.body.cards;
      expect(cards[0].id).toBe(card1.id);
      expect(cards[0].position).toBe(0);
      expect(cards[1].id).toBe(card2.id);
      expect(cards[1].position).toBe(1);
      expect(cards[2].id).toBe(card.id);
      expect(cards[2].position).toBe(2);
      expect(cards[3].id).toBe(card3.id);
      expect(cards[3].position).toBe(3);
    });

    it('should reorder cards when moving position backward', async () => {
      // Create multiple cards
      const card1 = await createTestCard(list.id, { title: 'Card 1', position: 1 });
      const card2 = await createTestCard(list.id, { title: 'Card 2', position: 2 });
      const card3 = await createTestCard(list.id, { title: 'Card 3', position: 3 });

      // Move card3 from position 3 to position 1
      const updateData = {
        position: 1,
      };

      await request(app)
        .put(`/api/cards/${card3.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      // Verify all cards are in correct order
      const cardsResponse = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const cards = cardsResponse.body.cards;
      expect(cards[0].id).toBe(card.id);
      expect(cards[0].position).toBe(0);
      expect(cards[1].id).toBe(card3.id);
      expect(cards[1].position).toBe(1);
      expect(cards[2].id).toBe(card1.id);
      expect(cards[2].position).toBe(2);
      expect(cards[3].id).toBe(card2.id);
      expect(cards[3].position).toBe(3);
    });

    it('should move card to another list', async () => {
      // Create another list
      const list2 = await createTestList(board.id, { title: 'List 2', position: 1 });
      await createTestCard(list2.id, { title: 'Existing Card', position: 0 });

      const updateData = {
        listId: list2.id,
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.card.listId).toBe(list2.id);
      expect(response.body.card.position).toBe(1); // Should be at the end

      // Verify card is moved
      const list2CardsResponse = await request(app)
        .get(`/api/cards/list/${list2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(list2CardsResponse.body.count).toBe(2);
    });

    it('should move card to another list at specific position', async () => {
      // Create another list with cards
      const list2 = await createTestList(board.id, { title: 'List 2', position: 1 });
      await createTestCard(list2.id, { title: 'Card A', position: 0 });
      await createTestCard(list2.id, { title: 'Card B', position: 1 });
      await createTestCard(list2.id, { title: 'Card C', position: 2 });

      const updateData = {
        listId: list2.id,
        position: 1,
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.card.listId).toBe(list2.id);
      expect(response.body.card.position).toBe(1);

      // Verify cards are in correct order in new list
      const list2CardsResponse = await request(app)
        .get(`/api/cards/list/${list2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const cards = list2CardsResponse.body.cards;
      expect(cards).toHaveLength(4);
      expect(cards[0].title).toBe('Card A');
      expect(cards[0].position).toBe(0);
      expect(cards[1].title).toBe('Original Title'); // Our moved card
      expect(cards[1].position).toBe(1);
      expect(cards[2].title).toBe('Card B');
      expect(cards[2].position).toBe(2);
      expect(cards[3].title).toBe('Card C');
      expect(cards[3].position).toBe(3);
    });

    it('should fail to move card to list owned by another user', async () => {
      // Create another user and their list
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });
      const otherList = await createTestList(otherBoard.id, { title: 'Other List' });

      const updateData = {
        listId: otherList.id,
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(403);

      expect(response.body.message).toBe('You do not have access to the target list');
    });

    it('should fail to update non-existent card', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put('/api/cards/99999')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(404);

      expect(response.body.message).toBe('Card not found');
    });

    it('should fail to update card from list owned by another user', async () => {
      // Create another user and their card
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });
      const otherList = await createTestList(otherBoard.id, { title: 'Other List' });
      const otherCard = await createTestCard(otherList.id, { title: 'Other Card' });

      const updateData = {
        title: 'Hacked Title',
      };

      const response = await request(app)
        .put(`/api/cards/${otherCard.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(403);

      expect(response.body.message).toBe('You do not have permission to update this card');
    });

    it('should fail with empty title', async () => {
      const updateData = {
        title: '',
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should fail with empty update data', async () => {
      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toBe('Invalid input data');
    });

    it('should fail with invalid card ID', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put('/api/cards/invalid')
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(400);

      expect(response.body.message).toBe('Invalid card ID');
    });

    it('should fail without authorization', async () => {
      const updateData = {
        title: 'Updated Title',
      };

      const response = await request(app)
        .put(`/api/cards/${card.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });

  describe('DELETE /api/cards/:id - Delete Card', () => {
    let user: User;
    let board: Board;
    let list: List;
    let card: Card;
    let token: string;

    beforeEach(async () => {
      user = await createTestUser();
      token = generateTestToken(user.id, user.email);
      board = await createTestBoard(user.id, { title: 'Test Board' });
      list = await createTestList(board.id, { title: 'Test List', position: 0 });
      card = await createTestCard(list.id, { title: 'Card to Delete', position: 0 });
    });

    it('should delete card successfully', async () => {
      const response = await request(app)
        .delete(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Card deleted successfully');

      // Verify card is deleted
      const getResponse = await request(app)
        .get(`/api/cards/${card.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(getResponse.body.message).toBe('Card not found');
    });

    it('should adjust positions of remaining cards after deletion', async () => {
      // Create multiple cards
      const card1 = await createTestCard(list.id, { title: 'Card 1', position: 1 });
      const card2 = await createTestCard(list.id, { title: 'Card 2', position: 2 });
      const card3 = await createTestCard(list.id, { title: 'Card 3', position: 3 });

      // Delete card at position 1
      await request(app)
        .delete(`/api/cards/${card1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify remaining cards have correct positions
      const cardsResponse = await request(app)
        .get(`/api/cards/list/${list.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const cards = cardsResponse.body.cards;
      expect(cards).toHaveLength(3);
      expect(cards[0].id).toBe(card.id);
      expect(cards[0].position).toBe(0);
      expect(cards[1].id).toBe(card2.id);
      expect(cards[1].position).toBe(1);
      expect(cards[2].id).toBe(card3.id);
      expect(cards[2].position).toBe(2);
    });

    it('should fail to delete non-existent card', async () => {
      const response = await request(app)
        .delete('/api/cards/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.message).toBe('Card not found');
    });

    it('should fail to delete card from list owned by another user', async () => {
      // Create another user and their card
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherBoard = await createTestBoard(otherUser.id, { title: 'Other Board' });
      const otherList = await createTestList(otherBoard.id, { title: 'Other List' });
      const otherCard = await createTestCard(otherList.id, { title: 'Other Card' });

      const response = await request(app)
        .delete(`/api/cards/${otherCard.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toBe('You do not have permission to delete this card');
    });

    it('should fail with invalid card ID', async () => {
      const response = await request(app)
        .delete('/api/cards/invalid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.message).toBe('Invalid card ID');
    });

    it('should fail without authorization', async () => {
      const response = await request(app)
        .delete(`/api/cards/${card.id}`)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });
  });
});

