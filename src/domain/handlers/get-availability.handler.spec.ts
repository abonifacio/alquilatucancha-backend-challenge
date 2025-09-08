import { Test, TestingModule } from "@nestjs/testing";
import { GetAvailabilityHandler } from "./get-availability.handler";
import { ALQUILA_TU_CANCHA_CLIENT } from "../ports/aquila-tu-cancha.client";
import { AdvancedCacheService } from "../../infrastructure/services/advanced-cache.service";
import { HTTPAlquilaTuCanchaClient } from "../../infrastructure/clients/http-alquila-tu-cancha.client";

describe("GetAvailabilityHandler", () => {
  let handler: GetAvailabilityHandler;
  let client: any;
  let advancedCache: jest.Mocked<AdvancedCacheService>;
  let httpClient: jest.Mocked<HTTPAlquilaTuCanchaClient>;

  beforeEach(async () => {
    const mockClient = {
      getClubs: jest.fn(),
      getCourts: jest.fn(),
      getAvailableSlots: jest.fn(),
    };

    const mockAdvancedCache = {
      getWithFallback: jest.fn(),
      setWithIntelligentTTL: jest.fn(),
      generateKey: jest.fn(),
      generateStaleKey: jest.fn(),
      invalidateByPattern: jest.fn(),
    };

    const mockHttpClient = {
      getAvailabilityOptimized: jest.fn(),
      getMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAvailabilityHandler,
        {
          provide: ALQUILA_TU_CANCHA_CLIENT,
          useValue: mockClient,
        },
        {
          provide: AdvancedCacheService,
          useValue: mockAdvancedCache,
        },
        {
          provide: HTTPAlquilaTuCanchaClient,
          useValue: mockHttpClient,
        },
      ],
    }).compile();

    handler = module.get<GetAvailabilityHandler>(GetAvailabilityHandler);
    client = module.get(ALQUILA_TU_CANCHA_CLIENT);
    advancedCache = module.get(AdvancedCacheService);
    httpClient = module.get(HTTPAlquilaTuCanchaClient);
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  it("should return cached availability when available", async () => {
    const query = { placeId: "test-place", date: new Date() };
    const cachedData = [{ id: 1, name: "Test Club", courts: [] }];

    advancedCache.getWithFallback.mockResolvedValue({
      data: cachedData,
      isStale: false,
    });

    const result = await handler.execute(query);

    expect(result).toEqual(cachedData);
    expect(advancedCache.getWithFallback).toHaveBeenCalled();
  });

  it("should return fallback data when fetch fails", async () => {
    const query = { placeId: "test-place", date: new Date() };
    const fallbackData = [{ id: 1, name: "Test Club", courts: [] }];

    advancedCache.getWithFallback
      .mockResolvedValueOnce({ data: null, isStale: false }) // No cache
      .mockResolvedValueOnce({ data: fallbackData, isStale: true }); // Fallback

    httpClient.getAvailabilityOptimized.mockRejectedValue(new Error("API Error"));

    const result = await handler.execute(query);

    expect(result).toEqual(fallbackData);
  });
});
