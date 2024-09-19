'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat , lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  _click(workout) {
    this.clicks++;
    // console.log(workout);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    //  min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //  km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//Application ARCHITECTURE
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 15;
  #workouts = [];
  // deleted = 0;
  // edited = 0;
  constructor() {
    //get user position
    this._getPosition();

    //get data from local storage
    this._getLocalStorage();

    //add event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    //show edit and delete
    containerWorkouts.addEventListener(
      'mouseover',
      this._showbuttons.bind(this)
    );

    //hide buttons
    containerWorkouts.addEventListener(
      'mouseout',
      this._hidebuttons.bind(this)
    );
  }
  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('give access to location you motherfucker');
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.#map);

    var marker = L.marker(coords).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    //loading markers on map from local storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
      console.log(work);
    });
  }

  _showForm(eventMap) {
    {
      this.#mapEvent = eventMap;
      form.classList.remove('hidden');
      console.log(eventMap);
      inputDistance.focus();
    }
  }

  _hideform() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    setTimeout(() => (form.style.display = 'grid'), 1000);
    form.classList.add('hidden');
  }

  _showbuttons(e) {
    e.stopPropagation();
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    this.workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    const edit = workoutEl.querySelector('.edit');
    const deletebut = workoutEl.querySelector('.delete');

    edit.style.display = 'inline-block';
    deletebut.style.display = 'inline-block';

    edit.classList.remove('hidden');
    deletebut.classList.remove('hidden');

    // Remove the inline scaling when the mouse is over but reset it when the mouse leaves
    edit.style.transform = 'scale(1)';
    deletebut.style.transform = 'scale(1)';

    // Attach edit event listener only once
    if (!edit.dataset.editAttached) {
      edit.addEventListener(
        'click',
        this._editForm.bind(this, this.workout, workoutEl)
      );
      edit.dataset.editAttached = true; // Flag to indicate listener is attached
    }

    // Attach delete event listener only once
    if (!deletebut.dataset.deleteAttached) {
      deletebut.addEventListener('click', this.delete.bind(this, this.workout));
      deletebut.dataset.deleteAttached = true; // Flag to indicate listener is attached
    }
  }

  _hidebuttons(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const edit = workoutEl.querySelector('.edit');
    const deletebut = workoutEl.querySelector('.delete');

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    edit.classList.add('hidden');
    deletebut.classList.add('hidden');
    if (e.target === edit) {
      edit.style.transform = 'scale(1)';
      edit.removeEventListener('click', function () {
        console.log('click removed');
      });
    }
    if (e.target === deletebut) {
      deletebut.style.transform = 'scale(1)';
      // console.log('unhover');
      deletebut.removeEventListener('click', function () {
        console.log('removed');
      });
    }
  }

  _toggleElevationField(e) {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    let lat, lng;
    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    console.log(this.#mapEvent.latlng);
    if (this.#mapEvent.latlng) {
      lat = this.#mapEvent.latlng.lat;
      lng = this.#mapEvent.latlng.lng;
    } else {
      lat = this.#mapEvent[0];
      lng = this.#mapEvent[1];
    }
    console.log(lat, lng);
    // const [lat, lng] = this.#mapEvent;
    let workout;
    console.log(this.#mapEvent);

    //if activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs must be only positive numbers');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //if activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs must be only positive numbers');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //add new object to the workout array

    this.#workouts.push(workout);

    //render workout on map as marker

    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);
    //hide Form + clear all inputs

    this._hideform();

    //set Local storage
    this._setLocalStorage();

    // location.reload();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === '   ' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <span class="edit hidden" data-edit-id="${workout.id}">edit</span>
    <span class="delete hidden" data-delete-id="${workout.id}">delete</span>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;
    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += `
      <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
      </div>
      </li>`;
    }
    const html1 = `<li class="workout workout--running" data-id="1234567890">
        <h2 class="workout__title">Running on April 14</h2>
        <div class="workout__details">
          <span class="workout__icon">🏃‍♂️</span>
          <span class="workout__value">5.2</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">24</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">4.6</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">178</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (workout?.coords) {
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });

      workout._click(workout);
    } else {
      this.#map.setView(this.currentWorkout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }

  //deleting a specific workout in console
  delete(w, count) {
    console.log('hi');
    console.log(w, count);
    this.deleted = 1;
    const workout = this.#workouts.indexOf(w);
    this.#workouts.splice(workout, 1);
    const data = JSON.parse(localStorage.getItem('myworkouts'));
    data.splice(workout, 1);
    console.log(data);
    localStorage.setItem('myworkouts', JSON.stringify(data));
    location.reload();
  }

  //editing a workout in console
  _editForm(w, con) {
    console.log(w, con);
    this.#mapEvent = w.coords;

    this.currentWorkout = w;

    const workout = this.#workouts.indexOf(w);
    this.#workouts.splice(workout, 1);

    form.classList.remove('hidden');
    con.classList.add('hidden');

    if (w.type === 'running') {
      inputDistance.value = w.distance;
      inputDuration.value = w.duration;
      inputCadence.value = w.cadence;
      inputType.value = 'running';
    }
    if (w.type === 'cycling') {
      inputDistance.value = w.distance;
      inputDuration.value = w.duration;
      inputCadence.value = w.elevationGain;
      inputType.value = 'cycling';
    }
    inputDistance.focus();
  }

  //getting all workouts in console
  getAllWorkouts() {
    console.log(this.#workouts);
  }

  //sort the arrays based on distance
  sort() {
    const workout = this.#workouts;

    workout.sort((a, b) => b.distance - a.distance);

    localStorage.setItem('myworkouts', JSON.stringify(workout));
    location.reload();
    console.log(workout);
  }
  _setLocalStorage() {
    console.log(this.#workouts);
    localStorage.setItem('myworkouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('myworkouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);

      console.log(work.__proto__);

      //creating prototpes for each object
      if (work.type === 'running') work.__proto__ = Running.prototype;
      if (work.type === 'cycling') work.__proto__ = Cycling.prototype;
    });
  }
  //resetting local storage using console
  reset() {
    localStorage.removeItem('myworkouts');
    location.reload();
  }
}

const app = new App();
