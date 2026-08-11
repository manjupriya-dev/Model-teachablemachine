using Microsoft.AspNetCore.SignalR;

namespace ImageBuilderMVC.Hubs
{
    public class TrainingHub : Hub
    {
        /// <summary>
        /// Broadcast live training progress (current epoch, total epochs, accuracy, loss)
        /// from Python TensorFlow/Keras training process to all connected frontend clients.
        /// </summary>
        public async Task SendProgress(int epoch, int totalEpochs, double accuracy, double loss)
        {
            await Clients.All.SendAsync("ReceiveProgress", epoch, totalEpochs, accuracy, loss);
        }

        /// <summary>
        /// Broadcast training completion event with final accuracy and loss.
        /// </summary>
        public async Task SendCompleted(double finalAccuracy, double finalLoss)
        {
            await Clients.All.SendAsync("ReceiveCompleted", finalAccuracy, finalLoss);
        }

        /// <summary>
        /// Join a specific training session room.
        /// </summary>
        public async Task JoinSession(string sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
        }
    }
}
