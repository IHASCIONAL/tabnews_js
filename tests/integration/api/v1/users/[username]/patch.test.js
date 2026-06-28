import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("PATCH /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("With unique 'username'", async () => {
      const createdUser = await orchestrator.createUser({});
      const response = await fetch(
        `http://localhost:3000/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application.json",
          },
          body: {
            username: "User2",
          },
        },
      );

      expect(response.status).toBe(403);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        action: 'Verifique se o seu usuário possui a feature "update:user"',
        message: "Você não possui permissão para executar esta ação.",
        name: "ForbiddenError",
        status_code: 403,
      });
    });
  });
});

describe("Default user", () => {
  test("With non existent username", async () => {
    const createdUser = await orchestrator.createUser();
    const activatedUser = await orchestrator.activateUser(createdUser);
    const sessionObject = await orchestrator.createSession(activatedUser.id);

    const response = await fetch(
      "http://localhost:3000/api/v1/users/UsuarioInexistente",
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      },
    );

    expect(response.status).toBe(404);
  });
  test("With duplicated username", async () => {
    //const createdUser = await orchestrator.createUser();

    await orchestrator.createUser({
      username: "user1",
    });

    const createdUser2 = await orchestrator.createUser({
      username: "user2",
    });

    const activatedUser2 = await orchestrator.activateUser(createdUser2);
    const sessionObject2 = await orchestrator.createSession(activatedUser2.id);

    const response = await fetch("http://localhost:3000/api/v1/users/user2", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject2.token}`,
      },
      body: JSON.stringify({
        username: "user1",
      }),
    });

    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      action: "Utilize outro username para esta operação.",
      message: "O username informado já está sendo utilizado",
      name: "ValidationError",
      status_code: 400,
    });
  });

  test("With duplicated 'email'", async () => {
    await orchestrator.createUser({
      email: "email1@curso.dev",
    });

    const createdUser2 = await orchestrator.createUser({
      email: "email2@curso.dev",
    });

    const activatedUser2 = await orchestrator.activateUser(createdUser2);
    const sessionObject2 = await orchestrator.createSession(activatedUser2.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser2.username}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject2.token}`,
        },
        body: JSON.stringify({
          email: "email1@curso.dev",
        }),
      },
    );
    expect(response.status).toBe(400);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      action: "Utilize outro email para esta operação.",
      message: "O email informado já está sendo utilizado",
      name: "ValidationError",
      status_code: 400,
    });
  });

  test("With unique username", async () => {
    const createdUser = await orchestrator.createUser();

    const activatedUser = await orchestrator.activateUser(createdUser);
    const sessionObject = await orchestrator.createSession(activatedUser.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          username: "uniqueUser2",
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: responseBody.id,
      username: "uniqueUser2",
      email: createdUser.email,
      features: ["create:session", "read:session", "update:user"],
      password: responseBody.password,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("With unique email", async () => {
    const createdUser = await orchestrator.createUser({
      email: "emailUnico@gmail.com",
    });

    const activatedUser = await orchestrator.activateUser(createdUser);
    const sessionObject = await orchestrator.createSession(activatedUser.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          email: "UmNovoEmail@gmail.com",
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    expect(responseBody).toEqual({
      id: responseBody.id,
      username: createdUser.username,
      email: "UmNovoEmail@gmail.com",
      features: ["create:session", "read:session", "update:user"],
      password: responseBody.password,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });

  test("With new password", async () => {
    const createdUser = await orchestrator.createUser();

    const activatedUser = await orchestrator.activateUser(createdUser);
    const sessionObject = await orchestrator.createSession(activatedUser.id);

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${createdUser.username}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          password: "TroqueiDeSenha123",
        }),
      },
    );

    expect(response.status).toBe(200);

    const responseBody = await response.json();

    const storedUser = await user.findOneByUsername(createdUser.username);

    expect(responseBody).toEqual({
      id: responseBody.id,
      username: createdUser.username,
      email: createdUser.email,
      features: ["create:session", "read:session", "update:user"],
      password: storedUser.password,
      created_at: responseBody.created_at,
      updated_at: responseBody.updated_at,
    });
  });
});
