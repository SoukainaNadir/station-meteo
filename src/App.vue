<template>
  <v-app>
    <v-app-bar color="primary" prominent>
      <v-app-bar-title class="text-h5 font-weight-bold">
        <v-icon start size="32">mdi-weather-partly-cloudy</v-icon>
        Station Météo
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <v-btn icon to="/">
        <v-icon>mdi-map</v-icon>
      </v-btn>
      <v-btn icon to="/comparison">
        <v-icon>mdi-compare</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main style="background-color: var(--background);">
      <router-view />
    </v-main>
  </v-app>
</template>

<style>
:root {
  --primary: #6C5CE7;
  --secondary: #00B894;
  --accent: #FDCB6E;
  
  --temperature: #FF7675;
  --humidity: #74B9FF;
  --pressure: #A29BFE;
  --wind: #55EFC4;
  --rain: #0984E3;
  --light: #FFEAA7;
  
  --background: #F5F6FA;
  --surface: #FFFFFF;
}

.v-application {
  font-family: 'Inter', sans-serif;
}
</style>