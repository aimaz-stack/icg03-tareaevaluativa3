/**
 * TESTS DE RATING
 *
 * Testea el endpoint PATCH /api/movies/:id/rating
 * que actualiza la puntuación (0-5) de una película.
 */

const request = require('supertest');

// ============================================
// CONFIGURACIÓN DE MOCKS
// ============================================
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  movie: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('../lib/prisma', () => mockPrisma);

jest.mock('../middleware/authMiddleware', () => {
  return (req, res, next) => {
    req.user = { userId: 'user-123' };
    next();
  };
});

const app = require('../server');
const prisma = require('../lib/prisma');

// ============================================
// SUITE DE TESTS: RATING
// ============================================
describe('API de Rating', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/movies/:id/rating', () => {

    // ========================================
    // CAMINO FELIZ
    // ========================================

    it('debería actualizar el rating de una película y devolver status 200', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        director: 'Christopher Nolan',
        year: 2010,
        posterUrl: 'https://example.com/inception.jpg',
        isFavorite: false,
        rating: 0,
        ownerId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const peliculaActualizada = { ...peliculaMock, rating: 4 };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 4 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(4);
      expect(prisma.movie.findFirst).toHaveBeenCalledWith({
        where: { id: 'movie-1', ownerId: 'user-123' },
      });
      expect(prisma.movie.update).toHaveBeenCalledWith({
        where: { id: 'movie-1' },
        data: { rating: 4 },
      });
    });

    it('debería permitir poner rating 0 (sin valorar)', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        rating: 3,
        ownerId: 'user-123',
      };
      const peliculaActualizada = { ...peliculaMock, rating: 0 };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 0 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(0);
    });

    it('debería permitir poner rating 5 (máximo)', async () => {
      // ARRANGE
      const peliculaMock = {
        id: 'movie-1',
        title: 'Inception',
        rating: 0,
        ownerId: 'user-123',
      };
      const peliculaActualizada = { ...peliculaMock, rating: 5 };

      prisma.movie.findFirst.mockResolvedValue(peliculaMock);
      prisma.movie.update.mockResolvedValue(peliculaActualizada);

      // ACT
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 5 });

      // ASSERT
      expect(response.status).toBe(200);
      expect(response.body.rating).toBe(5);
    });

    // ========================================
    // CAMINOS TRISTES: VALIDACIÓN
    // ========================================

    it('debería devolver 400 si el rating es mayor que 5', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 6 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si el rating es negativo', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si no se envía rating en el body', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si el rating es un decimal (no entero)', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3.5 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    it('debería devolver 400 si el rating es un string', async () => {
      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 'cinco' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(prisma.movie.findFirst).not.toHaveBeenCalled();
    });

    // ========================================
    // CAMINO TRISTE: PELÍCULA NO ENCONTRADA
    // ========================================

    it('debería devolver 404 si la película no existe o no pertenece al usuario', async () => {
      prisma.movie.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/movies/movie-inexistente/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(prisma.movie.update).not.toHaveBeenCalled();
    });

    // ========================================
    // CAMINO TRISTE: ERROR DEL SERVIDOR
    // ========================================

    it('debería devolver 500 si Prisma lanza un error inesperado', async () => {
      prisma.movie.findFirst.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .patch('/api/movies/movie-1/rating')
        .set('Authorization', 'Bearer fake-token')
        .send({ rating: 3 });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });
});
