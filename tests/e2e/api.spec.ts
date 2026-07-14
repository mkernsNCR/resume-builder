import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

test.describe("API Endpoints", () => {
  let testResumeId: string;

  test.beforeAll(async ({ request }) => {
    // Create a known test resume for isolated testing
    const response = await request.post("/api/resumes", {
      data: {
        title: "API Test Fixture Resume",
        template: "modern",
        content: { fullName: "API Test User" },
      },
    });
    
    // Fail fast if fixture creation failed
    expect(response.ok(), "Failed to create test fixture resume").toBeTruthy();
    expect(response.status()).toBe(201);
    
    const created = await response.json();
    expect(created.id, "Test fixture resume missing id").toBeDefined();
    testResumeId = created.id;
  });

  test.afterAll(async ({ request }) => {
    // Clean up test fixture
    if (testResumeId) {
      await request.delete(`/api/resumes/${testResumeId}`);
    }
  });

  test("GET /api/resumes should return array of resumes", async ({ request }) => {
    const response = await request.get("/api/resumes");
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const resumes = await response.json();
    expect(Array.isArray(resumes)).toBeTruthy();
    // Verify our test fixture exists
    const testResume = resumes.find((r: any) => r.id === testResumeId);
    expect(testResume).toBeDefined();
  });

  test("GET /api/resumes/:id should return single resume", async ({ request }) => {
    // Use the test fixture resume created in beforeAll
    const response = await request.get(`/api/resumes/${testResumeId}`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const resume = await response.json();
    expect(resume.id).toBe(testResumeId);
    expect(resume.title).toBe("API Test Fixture Resume");
    expect(resume.content).toBeDefined();
  });

  test("GET /api/resumes/:id should return 404 for non-existent resume", async ({ request }) => {
    const response = await request.get("/api/resumes/non-existent-id-12345");
    
    expect(response.status()).toBe(404);
  });

  test("POST /api/resumes/:id/score should score a persisted resume", async ({
    request,
  }) => {
    const response = await request.post(`/api/resumes/${testResumeId}/score`);

    expect(response.status()).toBe(200);
    const score = await response.json();
    expect(score.total).toBeGreaterThan(0);
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score.sections).toHaveLength(6);
    expect(
      score.sections.reduce(
        (total: number, section: { maxScore: number }) =>
          total + section.maxScore,
        0,
      ),
    ).toBe(100);
  });

  test("POST /api/resumes/:id/score should return 404 for a missing resume", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/resumes/non-existent-id-12345/score",
    );

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "RESUME_NOT_FOUND",
      message: "Resume not found",
    });
  });

  test("POST /api/resumes/:id/match should compare a persisted resume", async ({
    request,
  }) => {
    const createResponse = await request.post("/api/resumes", {
      data: {
        title: "API Engineer Match Test",
        template: "modern",
        content: {
          fullName: "Match Test User",
          title: "API Engineer",
          skills: [{ id: "skill-1", name: "TypeScript" }],
        },
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    try {
      const response = await request.post(`/api/resumes/${created.id}/match`, {
        data: {
          jobDescription:
            "Seeking an API engineer with TypeScript and software experience.",
        },
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.matchScore).toBeGreaterThan(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
      expect(result.matchedKeywords).toEqual(
        expect.arrayContaining(["api", "engineer", "typescript"]),
      );
      expect(result.suggestions.length).toBeGreaterThan(0);
    } finally {
      await request.delete(`/api/resumes/${created.id}`);
    }
  });

  test("POST /api/resumes/:id/match should reject an empty job description", async ({
    request,
  }) => {
    const response = await request.post(`/api/resumes/${testResumeId}/match`, {
      data: { jobDescription: "   " },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });

  test("POST /api/resumes/:id/match should return 404 for a missing resume", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/resumes/non-existent-id-12345/match",
      { data: { jobDescription: "React engineer" } },
    );

    expect(response.status()).toBe(404);
    expect((await response.json()).code).toBe("RESUME_NOT_FOUND");
  });

  test("POST /api/resumes/:id/suggestions should return grounded templates", async ({
    request,
  }) => {
    const createResponse = await request.post("/api/resumes", {
      data: {
        title: "Suggestion Test Resume",
        template: "modern",
        content: {
          fullName: "Suggestion Test User",
          title: "Engineer",
          experience: [
            {
              id: "experience-1",
              company: "Example Co",
              position: "Engineer",
              startDate: "2024",
            },
          ],
        },
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();

    try {
      const response = await request.post(
        `/api/resumes/${created.id}/suggestions`,
      );

      expect(response.status()).toBe(200);
      const suggestions = await response.json();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.find(
          (suggestion: { field: string }) =>
            suggestion.field === "highlights-experience-1",
        ).suggestedValue,
      ).toContain("[verified");
    } finally {
      await request.delete(`/api/resumes/${created.id}`);
    }
  });

  test("POST /api/resumes/:id/suggestions should return 404 for a missing resume", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/resumes/non-existent-id-12345/suggestions",
    );

    expect(response.status()).toBe(404);
    expect((await response.json()).code).toBe("RESUME_NOT_FOUND");
  });

  test("POST /api/resumes should create new resume", async ({ request }) => {
    const newResume = {
      title: "E2E Test Resume",
      template: "modern",
      content: {
        fullName: "Test User",
        title: "Test Engineer",
        summary: "This is a test resume created by E2E tests.",
        contact: {
          email: "test@e2e.com",
          phone: "555-0000",
        },
        experience: [],
        education: [],
        skills: [],
        projects: [],
      },
    };

    let created: { id?: string; title?: string } = {};
    try {
      const response = await request.post("/api/resumes", {
        data: newResume,
      });
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(201);
      
      created = await response.json();
      expect(created.id).toBeDefined();
      expect(created.title).toBe("E2E Test Resume");
    } finally {
      // Clean up created resume
      if (created?.id) {
        await request.delete(`/api/resumes/${created.id}`);
      }
    }
  });

  test("POST /api/resumes should be idempotent for a client-generated id", async ({
    request,
  }) => {
    const id = randomUUID();
    const initialData = {
      id,
      title: "Idempotent Create Test",
      template: "modern",
      content: { fullName: "Idempotent Test User" },
    };
    const latestData = {
      id,
      title: "Latest Idempotent Create Test",
      content: { fullName: "Latest Idempotent Test User" },
    };

    try {
      const firstResponse = await request.post("/api/resumes", {
        data: initialData,
      });
      const retryResponse = await request.post("/api/resumes", {
        data: latestData,
      });

      expect(firstResponse.status()).toBe(201);
      expect(retryResponse.status()).toBe(201);
      const first = await firstResponse.json();
      const retried = await retryResponse.json();
      expect(first.id).toBe(id);
      expect(retried.id).toBe(id);
      expect(retried.title).toBe(latestData.title);
      expect(retried.content).toEqual(latestData.content);
      expect(retried.template).toBe(initialData.template);
      expect(retried.createdAt).toBe(first.createdAt);

      const listResponse = await request.get("/api/resumes");
      const allResumes = await listResponse.json();
      expect(
        allResumes.filter((resume: { id: string }) => resume.id === id),
      ).toHaveLength(1);
    } finally {
      await request.delete(`/api/resumes/${id}`);
    }
  });

  test("POST /api/resumes/:id/duplicate should create an independent copy", async ({
    request,
  }) => {
    const sourceResponse = await request.post("/api/resumes", {
      data: {
        title: "Resume To Duplicate",
        template: "creative",
        content: {
          fullName: "Duplicate Test",
          title: "Product Designer",
          skills: [{ id: "skill-1", name: "Figma", level: "expert" }],
        },
      },
    });
    expect(sourceResponse.status()).toBe(201);
    const source = await sourceResponse.json();
    let duplicateId: string | undefined;

    try {
      const response = await request.post(
        `/api/resumes/${source.id}/duplicate`,
      );

      expect(response.status()).toBe(201);
      const duplicate = await response.json();
      duplicateId = duplicate.id;
      expect(duplicate.id).not.toBe(source.id);
      expect(duplicate.title).toBe("Resume To Duplicate (Copy)");
      expect(duplicate.template).toBe(source.template);
      expect(duplicate.content).toEqual(source.content);

      await request.put(`/api/resumes/${source.id}`, {
        data: { title: "Updated Source" },
      });
      const persistedCopy = await request.get(`/api/resumes/${duplicate.id}`);
      expect((await persistedCopy.json()).title).toBe(
        "Resume To Duplicate (Copy)",
      );
    } finally {
      await request.delete(`/api/resumes/${source.id}`);
      if (duplicateId) {
        await request.delete(`/api/resumes/${duplicateId}`);
      }
    }
  });

  test("POST /api/resumes/:id/duplicate should return 404 for a missing resume", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/resumes/non-existent-id-12345/duplicate",
    );

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "RESUME_NOT_FOUND",
      message: "Resume not found",
    });
  });

  test("PUT /api/resumes/:id should update resume", async ({ request }) => {
    // Create isolated resume for this test
    const createResponse = await request.post("/api/resumes", {
      data: {
        title: "Resume To Update",
        template: "modern",
        content: { fullName: "Update Test" },
      },
    });
    const created = await createResponse.json();
    const resumeId = created.id;

    try {
      // Update the resume
      const response = await request.put(`/api/resumes/${resumeId}`, {
        data: {
          title: "Updated Title via E2E",
        },
      });
      
      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);
      
      const updated = await response.json();
      expect(updated.title).toBe("Updated Title via E2E");
    } finally {
      // Clean up
      await request.delete(`/api/resumes/${resumeId}`);
    }
  });

  test("DELETE /api/resumes/:id should delete resume", async ({ request }) => {
    // First create a resume to delete
    const createResponse = await request.post("/api/resumes", {
      data: {
        title: "Resume To Delete",
        template: "minimal",
        content: {
          fullName: "Delete Me",
        },
      },
    });
    const created = await createResponse.json();

    // Delete the resume
    const response = await request.delete(`/api/resumes/${created.id}`);
    
    expect(response.status()).toBe(204);

    // Verify it's deleted
    const getResponse = await request.get(`/api/resumes/${created.id}`);
    expect(getResponse.status()).toBe(404);
  });

  test("POST /api/resumes should return 400 for invalid data", async ({ request }) => {
    const response = await request.post("/api/resumes", {
      data: {
        // Missing required fields
        invalid: "data",
      },
    });
    
    expect(response.status()).toBe(400);
  });
});
