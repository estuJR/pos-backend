@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package uvg.plataformas.examen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.material3.ExperimentalMaterial3Api


class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ExamenApp() }
    }
}

@Composable
fun ExamenApp() {
    val nav = rememberNavController()
    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Examen") },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors()
            )
        }
    ) { inner ->
        NavHost(
            navController = nav,
            startDestination = "home",
            modifier = Modifier.padding(inner)
        ) {
            composable("home") {
                HomeScreen(
                    onSuma = { nav.navigate("op/suma") },
                    onResta = { nav.navigate("op/resta") }
                )
            }
            composable(
                route = "op/{tipo}",
                arguments = listOf(
                    navArgument("tipo") { type = NavType.StringType }
                )
            ) { backStackEntry ->
                val tipo = backStackEntry.arguments?.getString("tipo") ?: "suma"
                OperationScreen(tipo = tipo)
            }
        }
    }
}



@Composable
fun HomeScreen(
    onSuma: () -> Unit,
    onResta: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(8.dp))
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ActionButton(text = "SUMA", onClick = onSuma)
            ActionButton(text = "RESTA", onClick = onResta)
        }
        Text(
            text = "Javier Estuardo Alvizures Chacón - 24333",
            style = MaterialTheme.typography.bodyMedium.copy(
                color = MaterialTheme.colorScheme.onSurfaceVariant
            ),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun ActionButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary
        )
    ) {
        Text(text, fontSize = 18.sp)
    }
}



@Composable
fun OperationScreen(tipo: String) {
    val tituloOperacion =
        if (tipo.equals("resta", ignoreCase = true)) "Resta" else "Suma"

    var n1 by remember { mutableStateOf("") }
    var n2 by remember { mutableStateOf("") }
    var resultado by remember { mutableStateOf<Int?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Operación: $tituloOperacion",
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold)
        )

        OutlinedTextField(
            value = n1,
            onValueChange = { n1 = it },
            label = { Text("Num 1") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )

        OutlinedTextField(
            value = n2,
            onValueChange = { n2 = it },
            label = { Text("Num 2") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth()
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center
        ) {
            Button(onClick = {
                val a = n1.toIntOrNull()
                val b = n2.toIntOrNull()
                resultado = if (a != null && b != null) {
                    if (tituloOperacion == "Resta") a - b else a + b
                } else null
            }) {
                Text("OPERAR")
            }
        }

        ElevatedCard(
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = "Resultado",
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = resultado?.toString() ?: "--",
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                style = MaterialTheme.typography.headlineSmall.copy(
                    fontWeight = FontWeight.Medium,
                    color = if (resultado != null) MaterialTheme.colorScheme.primary
                    else Color.Gray
                )
            )
        }
    }
}