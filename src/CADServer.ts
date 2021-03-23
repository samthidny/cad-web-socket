import * as http from 'http';
import { connection, IMessage, server as WebSocketServer } from 'websocket';
import CADDevice from './CADDevice';

interface IQuery {
  action: string,
  streams: string[]
}

class CADServer {


  private _updateTime: number = 1000;
  private _webSocketServer: WebSocketServer;
  private _streams: string[];
  private _streamInterval: NodeJS.Timeout;
  private _keepAlive: NodeJS.Timeout | null;
  private _connection: connection | null;
  private _device: CADDevice;

  constructor() {
    // Create fake CAD Device to get readings from
    this._device = new CADDevice();
    this._streams = [];
    this._streamInterval = setInterval(this._sendStreams.bind(this), this._updateTime);
    this._connection = null;
    this._keepAlive = null;

    // HTTP Server
    const server = http.createServer((request, response) => {
      response.writeHead(404);
      response.end();
    });
    server.listen(8080, () => {
      console.log((new Date()) + ' Server is listening on port 8080!');
    });

    // WEB SOCKET SERVER
    this._webSocketServer = new WebSocketServer({
      httpServer: server,
      autoAcceptConnections: false
    });

    this._webSocketServer.on('request', (request) => {
      this._connection = request.accept('echo-protocol', request.origin);

      this._connection.on('message', (message: IMessage) => {
        if (message.type === 'utf8') {
          this._sendMessage('Message received from NodeJS WebSocket ' + message.utf8Data)
        }

        const query: IQuery = this._messageToQuery(message);

        if (query) {
          // Keep Alive
          this._resetKeepAlive();

          if (query.streams) {
            query.streams.forEach((streamName: string) => {
              this._subscribeToStream(streamName);
            });
          }
        }
      });
    });
  }

  _messageToQuery(message: IMessage): IQuery {

    let query: IQuery;

    if (message.utf8Data && message.type === 'utf8') {

      // Is it valid JSON
      try {
        query = JSON.parse(message.utf8Data);
        return query;
      }
      // Invalid JSON request
      catch (err: any) {
        const errorText = 'ERROR ' + err.message;
        console.log(errorText);
      }

    }

    return { streams: [], action: '' };
  }

  _subscribeToStream(streamName: string): void {
    if(!this._streams.includes(streamName)) {
      this._streams.push(streamName);
    }
  }

  _sendStreams(): void {
    if (this._streams) {
      this._streams.forEach((streamName: string, index: number) => {
        const payload: object = this._getStreamPayload(streamName);
        this._sendMessage(`${JSON.stringify(payload)}`);
      });
    }

  }

  _sendMessage(message: string): void {
    if (this._connection) {
      this._connection.sendUTF(message);
    }
  }

  _resetKeepAlive(): void {
    if (this._keepAlive) {
      clearTimeout(this._keepAlive);
    }
    this._keepAlive = setTimeout(() => {
      this._sendMessage('Connection Timing Out');
      // Close connection
      if (this._connection) {
        this._connection.close();
      }
    }, 15000);
  }


  _getStreamPayload(streamName: string): object {
    
    let readings: number[] = [];
    let numMinutes: number = 5
    if(streamName.includes('activePower')) {
      if(streamName.includes('activePower.history')) {
        numMinutes = 60;
        readings = this._device.getActivePower(numMinutes);
      } else {
        numMinutes = 5;
        readings = this._device.getActivePower(numMinutes);
      }
    } else if(streamName.includes('currentCostsSmets2')) {
      readings = this._device.getActiveCost();
    }
      
    const obj = {
      type: 'update',
      stream: streamName,
      payload: {
        lastUpdated: new Date().getTime(),
        readings: readings
      }

    }
    return obj;
  }

}

export default CADServer;