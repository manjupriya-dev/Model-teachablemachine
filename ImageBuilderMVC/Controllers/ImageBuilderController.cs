using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ImageBuilderMVC.Hubs;
using System.Text.Json.Serialization;

namespace ImageBuilderMVC.Controllers
{
    public class ImageBuilderController : Controller
    {
        private readonly IHubContext<TrainingHub> _hubContext;
        private readonly IHttpClientFactory _httpClientFactory;

        public ImageBuilderController(IHubContext<TrainingHub> hubContext, IHttpClientFactory httpClientFactory)
        {
            _hubContext = hubContext;
            _httpClientFactory = httpClientFactory;
        }

        /// <summary>
        /// Renders the Image Builder & Real-Time Model Training Dashboard.
        /// </summary>
        public IActionResult Index()
        {
            return View();
        }

        /// <summary>
        /// Webhook endpoint called by Python TensorFlow SignalR callback after each epoch.
        /// Broadcasts epoch progress, accuracy, loss to SignalR frontend clients.
        /// </summary>
        [HttpPost("api/training/progress")]
        public async Task<IActionResult> ReportProgress([FromBody] EpochProgressRequest request)
        {
            if (request == null)
            {
                return BadRequest("Invalid progress payload.");
            }

            await _hubContext.Clients.All.SendAsync(
                "ReceiveProgress",
                request.Epoch,
                request.TotalEpochs,
                request.Accuracy,
                request.Loss
            );

            return Ok(new { success = true, message = $"Epoch {request.Epoch}/{request.TotalEpochs} broadcasted." });
        }

        /// <summary>
        /// Webhook endpoint called when Python TensorFlow model training completes.
        /// Broadcasts final accuracy & loss to SignalR frontend clients.
        /// </summary>
        [HttpPost("api/training/completed")]
        public async Task<IActionResult> ReportCompleted([FromBody] TrainingCompletedRequest request)
        {
            if (request == null)
            {
                return BadRequest("Invalid completion payload.");
            }

            await _hubContext.Clients.All.SendAsync(
                "ReceiveCompleted",
                request.FinalAccuracy,
                request.FinalLoss
            );

            return Ok(new { success = true, message = "Training completion broadcasted." });
        }
    }

    public class EpochProgressRequest
    {
        [JsonPropertyName("epoch")]
        public int Epoch { get; set; }

        [JsonPropertyName("total_epochs")]
        public int TotalEpochs { get; set; }

        [JsonPropertyName("accuracy")]
        public double Accuracy { get; set; }

        [JsonPropertyName("loss")]
        public double Loss { get; set; }
    }

    public class TrainingCompletedRequest
    {
        [JsonPropertyName("final_accuracy")]
        public double FinalAccuracy { get; set; }

        [JsonPropertyName("final_loss")]
        public double FinalLoss { get; set; }
    }
}
