import { test, expect } from "@playwright/test";

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
    const created = await response.json();
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

    const response = await request.post("/api/resumes", {
      data: newResume,
    });
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(201);
    
    const created = await response.json();
    expect(created.id).toBeDefined();
    expect(created.title).toBe("E2E Test Resume");
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
