// Set the current directory so we an find appSettings.json
Environment.CurrentDirectory = AppContext.BaseDirectory;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
  // Allow all CORS:
  options.AddDefaultPolicy(
      policy =>
      {
        policy
          .AllowAnyOrigin()
          .AllowAnyMethod()
          .AllowAnyHeader();
      });
});

var app = builder.Build();
app.UseCors();

// Set up GET to /
app.MapGet("/", () => $"It is {DateTime.Now:d MMM yyyy, HH:mm:ss} (GET)");
// Set up POST to /
app.MapPost("/", () => $"It is {DateTime.Now:d MMM yyyy, HH:mm:ss} (POST)");

app.Run();
