// Set the current directory so we an find appSettings.json
using Microsoft.AspNetCore.Mvc;

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
app.MapGet("/", () => $"It is {DateTime.Now:d MMM yyyy, HH:mm:ss} (GET) [.NET v{Environment.Version}]");
// Set up POST to /
app.MapPost("/", () => $"It is {DateTime.Now:d MMM yyyy, HH:mm:ss} (POST) [.NET v{Environment.Version}]");
// Set up post to /greet
app.MapPost("/greet", ([FromBody] GreetModel name) => $"Hello there, {name.Name}! It is {DateTime.Now:d MMM yyyy, HH:mm:ss}.");
app.Run();

class GreetModel
{
  public string? Name { get; set; }
}