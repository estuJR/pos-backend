import java.util.Arrays;

public class Grafo {
    public static final int INF = 99999;
    private final int[][] matriz;
    private final int numVertices;

    public Grafo(int numVertices) {
        this.numVertices = numVertices;
        this.matriz = new int[numVertices][numVertices];

        for (int i = 0; i < numVertices; i++) {
            Arrays.fill(matriz[i], INF);
            matriz[i][i] = 0;
        }
    }

    public void agregarArco(int origen, int destino, int peso) {
        matriz[origen][destino] = peso;
    }

    public void eliminarArco(int origen, int destino) {
        matriz[origen][destino] = INF;
    }

    public int[][] floyd() {
        int[][] dist = new int[numVertices][numVertices];

        for (int i = 0; i < numVertices; i++) {
            dist[i] = Arrays.copyOf(matriz[i], numVertices);
        }

        for (int k = 0; k < numVertices; k++) {
            for (int i = 0; i < numVertices; i++) {
                for (int j = 0; j < numVertices; j++) {
                    if (dist[i][k] + dist[k][j] < dist[i][j]) {
                        dist[i][j] = dist[i][k] + dist[k][j];
                    }
                }
            }
        }
        return dist;
    }

    public int calcularCentroGrafo() {
        int[][] distancias = floyd();
        int centro = -1;
        int minExcentricidad = INF;

        for (int i = 0; i < numVertices; i++) {
            int excentricidad = 0;
            for (int j = 0; j < numVertices; j++) {
                excentricidad = Math.max(excentricidad, distancias[i][j]);
            }
            if (excentricidad < minExcentricidad) {
                minExcentricidad = excentricidad;
                centro = i;
            }
        }
        return centro;
    }

    public int[][] getMatriz() {
        return matriz;
    }
}
