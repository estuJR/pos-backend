import java.util.Scanner;

public class Main {
    private static final String[] ciudades = { "Guatemala", "Zacapa", "Chiquimula", "Quetzaltenango", "Cobán" };
    private static int[][] distancias;
    private static int[][] siguiente;

    public static void main(String[] args) {
        Grafo g = new Grafo(5);
        inicializarGrafo(g);

        // Ejecutar Floyd y guardar matrices de distancias y caminos
        distancias = g.floyd();
        siguiente = construirMatrizSiguiente(g.getMatriz());

        Scanner scanner = new Scanner(System.in);
        int opcion;

        do {
            System.out.println("\n=== Menú ===");
            System.out.println("1. Ver matriz de distancias más cortas");
            System.out.println("2. Calcular centro del grafo");
            System.out.println("3. Buscar camino más corto entre dos ciudades");
            System.out.println("4. Salir");
            System.out.print("Opción: ");
            opcion = scanner.nextInt();

            switch (opcion) {
                case 1:
                    mostrarMatrizDistancias();
                    break;
                case 2:
                    int centro = g.calcularCentroGrafo();
                    System.out.println("Centro del grafo: " + ciudades[centro]);
                    break;
                case 3:
                    mostrarCiudades();
                    System.out.print("Ingrese ciudad origen (0-4): ");
                    int origen = scanner.nextInt();
                    System.out.print("Ingrese ciudad destino (0-4): ");
                    int destino = scanner.nextInt();
                    mostrarCamino(origen, destino);
                    break;
                case 4:
                    System.out.println("Saliendo del programa...");
                    break;
                default:
                    System.out.println("Opción inválida.");
            }
        } while (opcion != 4);
    }

    private static void inicializarGrafo(Grafo g) {
        g.agregarArco(0, 1, 3); // A -> B
        g.agregarArco(0, 3, 7); // A -> D
        g.agregarArco(1, 2, 1); // B -> C
        g.agregarArco(1, 4, 8); // B -> E
        g.agregarArco(2, 3, 2); // C -> D
        g.agregarArco(3, 4, 3); // D -> E
        g.agregarArco(4, 0, 4); // E -> A
    }

    private static void mostrarMatrizDistancias() {
        System.out.println("Matriz de caminos más cortos:");
        for (int[] fila : distancias) {
            for (int valor : fila) {
                if (valor == Grafo.INF) System.out.print("INF ");
                else System.out.print(valor + " ");
            }
            System.out.println();
        }
    }

    private static void mostrarCiudades() {
        for (int i = 0; i < ciudades.length; i++) {
            System.out.println(i + " - " + ciudades[i]);
        }
    }

    private static int[][] construirMatrizSiguiente(int[][] matriz) {
        int n = matriz.length;
        int[][] siguiente = new int[n][n];

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j || matriz[i][j] == Grafo.INF) {
                    siguiente[i][j] = -1;
                } else {
                    siguiente[i][j] = j;
                }
            }
        }

        for (int k = 0; k < n; k++) {
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (matriz[i][k] + matriz[k][j] < matriz[i][j]) {
                        matriz[i][j] = matriz[i][k] + matriz[k][j];
                        siguiente[i][j] = siguiente[i][k];
                    }
                }
            }
        }
        return siguiente;
    }

    private static void mostrarCamino(int origen, int destino) {
        if (distancias[origen][destino] == Grafo.INF) {
            System.out.println("No hay camino entre las ciudades.");
            return;
        }

        System.out.print("Ruta más corta: ");
        int actual = origen;
        System.out.print(ciudades[actual]);

        while (actual != destino) {
            actual = siguiente[actual][destino];
            System.out.print(" -> " + ciudades[actual]);
        }

        System.out.println("\nDistancia total: " + distancias[origen][destino] + " km");
    }
}
