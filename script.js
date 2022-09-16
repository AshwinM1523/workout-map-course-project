'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class Workout {
    date = new Date();
    id = (Date.now() + '' ).slice(-10);

    constructor(coords, distance, duration){
        this.coords = coords; //(lat, lng)
        this.distance = distance; //in km
        this.duration = duration; //in min
    }
}

class Running extends Workout {
    type = 'running';
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this.#setDescription();
    }

    calcPace(){
        // min/km
        this.pace = this.duration/this.distance;
        return this.pace;
    }

    #setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}`
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevation){
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this.#setDescription();

    }

    calcSpeed(){
        // km/h
        this.speed = this.distance / this.duration / 60;
        return this.speed;
    }

    #setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]}`
    }
}

//////////////////////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
    // Private Properties
    #map;
    #mapEvent;
    #workouts = [];
    #mapZoomLevel = 13;

    constructor(){
        // Get User position
        this.#getposition();
        // Get data from local storage
        this.#getLocalStorage();

        // Attach event handlers
        //automatically gets called when we create the app
        form.addEventListener('submit', this.#newWorkout.bind(this));
        //event handler this keyword is pointed towards the DOM element its attached to(always) so we bind
        inputType.addEventListener('change', this.#toggleElevationField);
        containerWorkouts.addEventListener('click', this.#moveToPopup.bind(this));
    }
    // Private Methods
    #getposition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this.#loadMap.bind(this), function(){
                alert('Location None')
            })
        }
    }

    #loadMap(position){
        const { latitude } = position.coords;
        const { longitude } = position.coords;

        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#mapZoomLevel); //Where the map location is first set

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {//Open source map
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        //handling clicks on map
        this.#map.on('click', this.#showMap.bind(this));  


        this.#workouts.forEach(work => {
            this.#renderWorkoutMarker(work);
        });
    }

    #showMap(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    #hideForm(){
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');

        setTimeout(() => (form.style.display = 'grid'), 1000);

    }

    #toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    #newWorkout(e){
        const validInputs = (...Inputs) => Inputs.every(inp => Number.isFinite(inp) && inp > 0);
        e.preventDefault();

        // Get data from form
        const type  = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // If activity running create object
        if(type === 'running'){
            const cadence = +inputCadence.value;
            if(!validInputs(distance, duration, cadence)) return alert('Not valid Input');

            workout = new Running([lat, lng], distance, duration, cadence);
        }
        // If activity cycling create object
        if(type === 'cycling'){
            const elevation = +inputElevation.value;
            if(!validInputs(distance, duration, elevation)) return alert('Not valid Input');
            workout = new Cycling([lat, lng], distance, duration, elevation);

        }
        this.#workouts.push(workout); // Add new object to workout array

        // Render workout on map as marker
        this.#renderWorkoutMarker(workout);

        // Render workout on fields
        this.#renderWorkout(workout);
        // Hide form + clear input fields
        this.#hideForm();
    
        // Set local storage to all workouts
        this.#setLocalStorage()
    }

    #renderWorkoutMarker(workout){
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
        }))
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`)
        .openPopup();
    }

    #renderWorkout(workout){
        let html = `<li class="workout ${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴'}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

        if(workout.type === 'running'){
            html += `<div class="workout__details">
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

        if(workout.type === 'cycling'){
            html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    #moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        // We look through the workout array to find the ID that matches the element we clicked on and get the workout

        this.#map.setView(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });
        //setView is a leaftlet method

        // using the public interface
    }
    #setLocalStorage(){
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
        // localStorage is an api that the browser supplies
        // We are setting all workouts to local storage
    }

    #getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));
        // We get an array with objects
        if(!data) return;

        this.#workouts = data;
        this.#workouts.forEach(work => {
            this.#renderWorkout(work);
        });

    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();//reloads the page
    }
}

const app = new App();