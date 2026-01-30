import { test, expect } from "@playwright/test";

test.describe("API Endpoints", () => {
  test("GET /api/resumes should return array of resumes", async ({ request }) => {
    const response = await request.get("/api/resumes");
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const resumes = await response.json();
    expect(Array.isArray(resumes)).toBeTruthy();
    expect(resumes.length).toBeGreaterThan(0);
  });

  test("GET /api/resumes/:id should return single resume", async ({ request }) => {
    // First get all resumes to find an ID
    const listResponse = await request.get("/api/resumes");
    const resumes = await listResponse.json();
    const resumeId = resumes[0].id;

    // Get single resume
    const response = await request.get(`/api/resumes/${resumeId}`);
    
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    
    const resume = await response.json();
    expect(resume.id).toBe(resumeId);
    expect(resume.title).toBeDefined();
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
    // First get all resumes to find an ID
    const listResponse = await request.get("/api/resumes");
    const resumes = await listResponse.json();
    const resumeId = resumes[0].id;

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
