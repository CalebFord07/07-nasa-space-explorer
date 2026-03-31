// Find the parts of the page we want to work with
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const button = document.querySelector('button');
const container = document.querySelector('.container');

// Call the setupDateInputs function from dateRange.js
// This sets up the default 9-day range and keeps the dates valid.
setupDateInputs(startInput, endInput);

// NASA APOD (Astronomy Picture of the Day) API endpoint and key
const apiKey = 'aoi9EGpHZZoxn6OI9MlK1b7QNWhXip5vwCYvaIH8';
const apiUrl = 'https://api.nasa.gov/planetary/apod';
const gallerySize = 9;

// This helps repeat searches feel faster.
const apodCache = new Map();

// This array will store the current gallery data so we can reuse it if needed.
let currentPhotos = [];

// A few fun facts to show students something interesting on each page refresh.
const spaceFacts = [
  'A day on Venus is longer than a year on Venus.',
  'Neutron stars can spin more than 600 times every second.',
  'The footprints left on the Moon can last for millions of years.',
  'Jupiter is so large that more than 1,300 Earths could fit inside it.',
  'One million Earths could fit inside the Sun.',
  'Saturn could float in water because it is less dense than water.',
  'Light from the Sun takes about 8 minutes to reach Earth.'
];

// Create a "Did You Know?" fact card and a video notice area above the gallery.
const factSection = document.createElement('section');
factSection.className = 'space-fact';

const videoSection = document.createElement('section');
videoSection.className = 'video-section hidden';

container.insertBefore(videoSection, gallery);
container.insertBefore(factSection, videoSection);

// Create the modal once, then update its content whenever a card is clicked.
const modal = document.createElement('div');
modal.className = 'modal hidden';
modal.innerHTML = `
  <div class="modal-content">
    <button class="modal-close" aria-label="Close modal">✕</button>
    <img class="modal-image" src="" alt="" />
    <div class="modal-text">
      <p class="modal-date"></p>
      <h2 class="modal-title"></h2>
      <p class="modal-explanation"></p>
    </div>
  </div>
`;
document.body.appendChild(modal);

const closeModalButton = modal.querySelector('.modal-close');
const modalImage = modal.querySelector('.modal-image');
const modalDate = modal.querySelector('.modal-date');
const modalTitle = modal.querySelector('.modal-title');
const modalExplanation = modal.querySelector('.modal-explanation');

// Show a random fact when the page loads.
function showRandomSpaceFact() {
  const randomIndex = Math.floor(Math.random() * spaceFacts.length);
  factSection.innerHTML = `
    <h2>✨ Did You Know?</h2>
    <p>${spaceFacts[randomIndex]}</p>
  `;
}

// Show a short loading message while the API request is in progress.
function showLoadingMessage() {
  renderVideoSection([]);
  gallery.innerHTML = `
    <div class="status-message loading-message">
      🔄 Loading space photos…
    </div>
  `;
}

// Show an error message if something goes wrong.
function showErrorMessage(message) {
  renderVideoSection([]);
  gallery.innerHTML = `
    <div class="status-message error-message">
      ${message}
    </div>
  `;
}

// Convert a JavaScript Date into the YYYY-MM-DD format NASA expects.
function formatDateForApi(date) {
  return date.toISOString().split('T')[0];
}

// Show clear links for any APOD entries that are videos.
function renderVideoSection(videos) {
  if (videos.length === 0) {
    videoSection.classList.add('hidden');
    videoSection.innerHTML = '';
    return;
  }

  const videoLinks = videos.map((video) => `
    <li>
      <a href="${video.url}" target="_blank" rel="noopener noreferrer">
        🎬 Watch NASA's video for ${video.date}: ${video.title}
      </a>
    </li>
  `).join('');

  videoSection.innerHTML = `
    <h2>APOD Videos Found</h2>
    <p>Some Astronomy Picture of the Day entries are videos. Use the links below to open them in a new tab.</p>
    <ul>${videoLinks}</ul>
  `;
  videoSection.classList.remove('hidden');
}

// Fetch APOD data for a date range.
async function fetchApodData(startDate, endDate) {
  const cacheKey = `${startDate}_${endDate}`;

  if (apodCache.has(cacheKey)) {
    return apodCache.get(cacheKey);
  }

  const response = await fetch(`${apiUrl}?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}`);

  if (!response.ok) {
    throw new Error('NASA data could not be loaded right now.');
  }

  const data = await response.json();
  const photos = Array.isArray(data) ? data : [data];
  apodCache.set(cacheKey, photos);
  return photos;
}

// Always try to fill the gallery with 9 image cards.
async function getNinePhotos(startDate, endDate) {
  let searchStart = new Date(startDate);
  const searchEnd = new Date(endDate);

  // If the chosen range is shorter than 9 days, go backward to fill the rest.
  const selectedDays = Math.floor((searchEnd - searchStart) / (1000 * 60 * 60 * 24)) + 1;
  if (selectedDays < gallerySize) {
    searchStart.setDate(searchStart.getDate() - (gallerySize - selectedDays));
  }

  // Never go earlier than NASA's first APOD date.
  if (formatDateForApi(searchStart) < earliestDate) {
    searchStart = new Date(earliestDate);
  }

  let photos = [];
  let videos = [];

  // Some APOD entries are videos, so keep going farther back until we have 9 images.
  while (photos.length < gallerySize) {
    const data = await fetchApodData(formatDateForApi(searchStart), endDate);

    photos = data
      .filter((item) => item.media_type === 'image')
      .sort((firstPhoto, secondPhoto) => new Date(secondPhoto.date) - new Date(firstPhoto.date));

    videos = data
      .filter((item) => item.media_type === 'video')
      .sort((firstPhoto, secondPhoto) => new Date(secondPhoto.date) - new Date(firstPhoto.date));

    if (photos.length >= gallerySize || formatDateForApi(searchStart) === earliestDate) {
      break;
    }

    searchStart.setDate(searchStart.getDate() - gallerySize);

    if (formatDateForApi(searchStart) < earliestDate) {
      searchStart = new Date(earliestDate);
    }
  }

  return {
    images: photos.slice(0, gallerySize),
    videos
  };
}

// Open the modal with a larger image and the full explanation text.
function openModal(photo) {
  modalImage.src = photo.hdurl || photo.url;
  modalImage.alt = photo.title;
  modalDate.textContent = photo.date;
  modalTitle.textContent = photo.title;
  modalExplanation.textContent = photo.explanation;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

// Hide the modal.
function closeModal() {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

// Turn the API data into gallery cards.
function renderGallery(photos) {
  if (photos.length === 0) {
    showErrorMessage('No images were found for this date range. Try another set of dates.');
    return;
  }

  const galleryMarkup = photos.map((photo) => `
    <article class="gallery-item" data-date="${photo.date}">
      <img src="${photo.url}" alt="${photo.title}" loading="lazy" decoding="async" />
      <p class="gallery-date">${photo.date}</p>
      <h2>${photo.title}</h2>
    </article>
  `).join('');

  gallery.innerHTML = galleryMarkup;
}

// Fetch photos from NASA using the selected start and end dates.
async function getSpaceImages() {
  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate) {
    showErrorMessage('Please choose both a start date and an end date.');
    return;
  }

  if (startDate > endDate) {
    showErrorMessage('Your start date must be on or before your end date.');
    return;
  }

  showLoadingMessage();
  button.disabled = true;
  button.textContent = 'Loading...';

  try {
    const results = await getNinePhotos(startDate, endDate);
    currentPhotos = results.images;
    renderVideoSection(results.videos);
    renderGallery(currentPhotos);
  } catch (error) {
    showErrorMessage('Something went wrong while loading NASA images. Please try again.');
    console.error(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Get Space Images';
  }
}

// When the user clicks the button, load a new gallery.
button.addEventListener('click', getSpaceImages);

// Use one gallery click listener for smoother interaction.
gallery.addEventListener('click', (event) => {
  const galleryItem = event.target.closest('.gallery-item');

  if (!galleryItem) {
    return;
  }

  const selectedPhoto = currentPhotos.find((photo) => photo.date === galleryItem.dataset.date);
  if (selectedPhoto) {
    openModal(selectedPhoto);
  }
});

// Close the modal in a few different easy ways.
closeModalButton.addEventListener('click', closeModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

// Show a fun fact right away, but wait for the button before loading images.
showRandomSpaceFact();
