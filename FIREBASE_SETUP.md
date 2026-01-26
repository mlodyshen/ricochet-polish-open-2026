# Instrukcja konfiguracji Firebase Firestore

Aby Twoja aplikacja zapisywała dane w chmurze (wspólnej bazie danych dla wszystkich urządzeń), wykonaj poniższe kroki w konsoli Firebase.

## 1. Załóż projekt w Firebase
1. Wejdź na stronę [Firebase Console](https://console.firebase.google.com/).
2. Kliknij **"Add project"** (lub "Stwórz projekt").
3. Nazwij go np. `ricochet-open-2026`.
4. Wyłącz Google Analytics (nie jest potrzebne na start) i kliknij **"Create project"**.

## 2. Skonfiguruj bazę danych (Firestore)
1. W lewym menu wybierz **"Build"** -> **"Firestore Database"**.
2. Kliknij **"Create database"**.
3. Wybierz lokalizację serwera (np. `eur3 (Europe-West)` lub `us-central1` - nie ma to kluczowego znaczenia dla małej skali).
4. **WAŻNE:** Gdy zostaniesz zapytany o tryb bezpieczeństwa ("Security Rules"), wybierz **"Start in test mode"** (Pozwoli to na zapis/odczyt przez 30 dni bez logowania, co ułatwi start).
   - *Docelowo będziesz musiał zmienić reguły, ale na start "Test mode" jest OK.*
5. Kliknij **"Create"**.

## 3. Pobierz konfigurację (API Keys)
1. Kliknij ikonę koła zębatego ("Project Settings") obok "Project Overview" w lewym górnym rogu.
2. Na dole w sekcji "Your apps" kliknij ikonę **Web (</>)**.
3. Wpisz nazwę aplikacji (np. `Ricochet Web`) i kliknij **"Register app"**.
4. Pomin krok "Add Firebase SDK" (już to zrobiłem w kodzie).
5. Zobaczysz kod z obiektem `firebaseConfig`. Skopiuj zawartość tego obiektu. Wygląda to mniej więcej tak:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

## 4. Wklej konfigurację do projektu
1. Otwórz w swoim edytorze kodu plik: `src/lib/firebase.js`.
2. Zastąp przykładowy obiekt `firebaseConfig` tym, który skopiowałeś z konsoli Firebase.
   - Pamiętaj, aby podmienić całą zawartość obiektu, łącznie z `projectId`, które jest kluczem do wykrycia czy Firebase jest aktywne.

## 5. Gotowe!
Po zapisaniu pliku `src/lib/firebase.js`, aplikacja automatycznie wykryje konfigurację i zacznie korzystać z Firebase zamiast LocalStorage.
- Wszystkie urządzenia, na których otworzysz aplikację (po wdrożeniu zmian na Vercel), będą widziały tę samą listę turniejów i zawodników.

### Uwaga
Jeśli wcześniej korzystałeś z `LocalStorage` (dane zapisane tylko w przeglądarce), te dane **nie przeniosą się automatycznie** do Firebase. Będziesz musiał utworzyć turniej i dodać zawodników na nowo w "chmurze".
