let movies; // List of movies from TMDB
let movie; // Single Movie
let movieimgs; // List of Movie Posters for a particular movie

describe("Base tests", () => {

    before(() => {
        // Get the discover movies from TMDB and store them locally.
        cy.request(
            `https://api.themoviedb.org/3/discover/movie?api_key=${Cypress.env(
            "TMDB_KEY"
            )}&language=en-US&include_adult=false&include_video=false&page=1`
        )
            .its("body") // Take the body of HTTP response from TMDB
            .then((response) => {
            movies = response.results;
            });
    });
    
    beforeEach(() => {
        cy.visit("/");
    });

    describe("The Discover Movies page", () => {
        it("displays the page header and 7 movies on first load", () => {
            cy.get("h3").contains("Discover Movies");
            cy.get(".MuiCardHeader-root").should("have.length", 7);
        });

        it("displays the 'Filter Movies' card and all relevant filter/sort fields", () => {
            cy.get(".MuiGrid-root.MuiGrid-container")
            .eq(1)
            .find(".MuiGrid-root.MuiGrid-item")
            .eq(0)
            .within(() => {
                cy.get("h1").contains("Filter Movies");
                //Check if Input and Select fields are as expected
                cy.get("#filled-search").should('have.class',
                    "MuiInputBase-input MuiFilledInput-input MuiInputBase-inputTypeSearch");
                cy.get("#genre-select").should('have.class',
                    "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused");
                cy.get("#sort-select").should('have.class', "MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input")
                //Check if Movies are sorted by popularity by default
                .contains("Popularity");
            });
        })

        it("displays the correct movie information and sorts movies by popularity", () => {
            //Sort movies by popularity
            var sorted_movies = movies.sort((m1, m2) => (
                (m1.popularity < m2.popularity) ? 1 : (m1.popularity > m2.popularity) ? -1 : 0
              ));

            //Confirm title is correct
            cy.get(".MuiCardHeader-content").each(($card, index) => {
                //Necessary to prevent errors when API returns double spacing.
                var title = sorted_movies[index].title.replace( /\s\s+/g, ' ' );
                cy.wrap($card).find("p").contains(title);
            });

            //Confirm Poster is correct
            cy.get(".MuiCardMedia-root").each(($card, index) => {
                var poster = "https://image.tmdb.org/t/p/w500/" + sorted_movies[index].poster_path;
                cy.wrap($card).should('have.attr', 'style', 'background-image: url("' + poster + '");');
            });

            //Confirm Release Date and Rating are correct
            cy.get(".MuiCardContent-root").each(($card, index) => {
                var release = sorted_movies[index].release_date;
                var rating = sorted_movies[index].vote_average;
                cy.wrap($card).should('contain', release).and('contain', rating);
            });

            //Confirm Favourites Button and More Info button are rendered
            cy.get(".MuiCardActions-root").each(($card, index) => {
                cy.wrap($card).find('button').should('have.attr', 'aria-label', 'add to favorites');
                cy.wrap($card).find('a').should('have.attr', 'href', '/movies/' + sorted_movies[index].id)
                    .and('contain', 'More Info ...');
            });
        });
    });

    describe("The Movie Details page", () => {

        before(() => {
            cy.request(
            `https://api.themoviedb.org/3/movie/${
                movies[0].id
            }?api_key=${Cypress.env("TMDB_KEY")}`
            )
            .its("body")
            .then((movieDetails) => {
                movie = movieDetails;
            });

            cy.request(
                `https://api.themoviedb.org/3/movie/${
                    movies[0].id
                }/images?api_key=${Cypress.env("TMDB_KEY")}`
                )
                .its("body")
                .then((movieImages) => {
                    movieimgs = movieImages;
                });
        });

        beforeEach(() => {
            cy.visit(`/movies/${movies[0].id}`);
        });

        it(" displays the movie title, overview and genres", () => {
            //Necessary to prevent errors when API returns double spacing.
            var title = movie.title.replace( /\s\s+/g, ' ' );
            cy.get("h3").contains(title);
            cy.get("h3").contains("Overview");

            //Necessary to prevent errors when API returns double spacing.
            var overview = movie.overview.replace( /\s\s+/g, ' ' );
            cy.get("p").contains(overview);
            cy.get("ul")
            .eq(0)
            .within(() => {
                const genreChipLabels = movie.genres.map((g) => g.name);
                genreChipLabels.unshift("Genres");
                cy.get("span").each(($card, index) => {
                    cy.wrap($card).contains(genreChipLabels[index]);
                });
            });
        });

        it(" displays the movie posters in a carousel", () => {
            cy.get(".MuiGrid-root")
            .eq(0)
            .find(".MuiGrid-root.MuiGrid-item")
            .eq(0)
            .within(() => {
                var imgPath = movieimgs.posters.map((image) => image.file_path);
                cy.get("div").find("img").each(($img, index) => {
                    cy.wrap($img).should('have.attr', 'src', 'https://image.tmdb.org/t/p/w500/' + imgPath[index]);
                });
            });
        });

        it(" displays the movie runtime, revenue, vote, and release date", () => {
            cy.get("ul")
            .eq(1)
            .within(() => {
                cy.get("span").contains(movie.runtime);
                cy.get("span").contains(movie.revenue.toLocaleString());
                cy.get("span").contains(movie.vote_average);
                cy.get("span").contains(movie.release_date);
            });
        });

        it(" displays the production countries and view cast/crew buttons", () => {
            cy.get("ul")
            .eq(2)
            .within(() => {
                const countryChipLabels = movie.production_countries.map((g) => g.name);
                countryChipLabels.unshift("Production Countries");
                cy.get("span").each(($card, index) => {
                    cy.wrap($card).contains(countryChipLabels[index]);
                });
            });
            cy.get("button").contains("View Cast", { matchCase: false });
            cy.get("button").contains("View Crew", { matchCase: false });
        });

        it(" displays the reviews button", () => {
            cy.get("button.MuiButtonBase-root.MuiFab-root").contains("Reviews", { matchCase: false });
        });
    });

    describe("The Favorites page", () => {
        beforeEach(() => {
            cy.visit("/movies/favorites");
        });

        it("displays the page header", () => {
            cy.get("h3").contains("Favorite Movies");
        });

        it("displays the 'Filter Movies' card and all relevant filter/sort fields", () => {
            cy.get(".MuiGrid-root.MuiGrid-container")
            .eq(1)
            .find(".MuiGrid-root.MuiGrid-item")
            .eq(0)
            .within(() => {
                cy.get("h1").contains("Filter Movies");
                //Check if Input and Select fields are as expected
                cy.get("#filled-search").should('have.class',
                    "MuiInputBase-input MuiFilledInput-input MuiInputBase-inputTypeSearch");
                cy.get("#genre-select").should('have.class',
                    "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused");
                cy.get("#sort-select").should('have.class', "MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input")
                //Check if Movies are sorted by popularity by default
                .contains("Popularity");
            });
        });
    });

    describe("The Upcoming Movies page", () => {

        before(() => {
            cy.request(
            `https://api.themoviedb.org/3/movie/upcoming?api_key=${Cypress.env("TMDB_KEY")}`
            )
            .its("body")
            .then((response) => {
            movies = response.results;
            });
        });

        beforeEach(() => {
            cy.visit("/movies/upcoming");
        });

        it("displays the page header and 7 movies on first load", () => {
            cy.get("h3").contains("Upcoming Movies");
            cy.get(".MuiCardHeader-root").should("have.length", 7);
        });

        it("displays the 'Filter Movies' card and all relevant filter/sort fields", () => {
            cy.get(".MuiGrid-root.MuiGrid-container")
            .eq(1)
            .find(".MuiGrid-root.MuiGrid-item")
            .eq(0)
            .within(() => {
                cy.get("h1").contains("Filter Movies");
                //Check if Input and Select fields are as expected
                cy.get("#filled-search").should('have.class',
                    "MuiInputBase-input MuiFilledInput-input MuiInputBase-inputTypeSearch");
                cy.get("#genre-select").should('have.class',
                    "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused");
                cy.get("#sort-select").should('have.class', "MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input")
                //Check if Movies are sorted by popularity by default
                .contains("Popularity");
            });
        });

        it("displays the correct movie information and sorts movies by popularity", () => {
            //Sort movies by popularity
            var sorted_movies = movies.sort((m1, m2) => (
                (m1.popularity < m2.popularity) ? 1 : (m1.popularity > m2.popularity) ? -1 : 0
              ));

            //Confirm title is correct
            cy.get(".MuiCardHeader-content").each(($card, index) => {
                //Necessary to prevent errors when API returns double spacing.
                var title = sorted_movies[index].title.replace( /\s\s+/g, ' ' );
                cy.wrap($card).find("p").contains(title);
            });

            //Confirm Poster is correct
            cy.get(".MuiCardMedia-root").each(($card, index) => {
                var poster = "https://image.tmdb.org/t/p/w500/" + sorted_movies[index].poster_path;
                cy.wrap($card).should('have.attr', 'style', 'background-image: url("' + poster + '");');
            });

            //Confirm Release Date and Rating are correct
            cy.get(".MuiCardContent-root").each(($card, index) => {
                var release = sorted_movies[index].release_date;
                var rating = sorted_movies[index].vote_average;
                cy.wrap($card).should('contain', release).and('contain', rating);
            });

            //Confirm Must Watch Button and More Info button are rendered
            cy.get(".MuiCardActions-root").each(($card, index) => {
                cy.wrap($card).find('button').should('have.attr', 'aria-label', 'add to must watch');
                cy.wrap($card).find('a').should('have.attr', 'href', '/movies/' + sorted_movies[index].id)
                    .and('contain', 'More Info ...');
            });
        });
    });

    describe("The Must Watch page", () => {
        beforeEach(() => {
            cy.visit("/movies/mustwatch");
        });

        it("displays the page header", () => {
            cy.get("h3").contains("Your Must-Watch Movies");
        });

        it("displays the 'Filter Movies' card and all relevant filter/sort fields", () => {
            cy.get(".MuiGrid-root.MuiGrid-container")
            .eq(1)
            .find(".MuiGrid-root.MuiGrid-item")
            .eq(0)
            .within(() => {
                cy.get("h1").contains("Filter Movies");
                //Check if Input and Select fields are as expected
                cy.get("#filled-search").should('have.class',
                    "MuiInputBase-input MuiFilledInput-input MuiInputBase-inputTypeSearch");
                cy.get("#genre-select").should('have.class',
                    "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused");
                cy.get("#sort-select").should('have.class', "MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input")
                //Check if Movies are sorted by popularity by default
                .contains("Popularity");
            });
        });
    });

    describe("The Trending page", () => {
        before(() => {
            cy.request(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${Cypress.env("TMDB_KEY")}`
            )
            .its("body")
            .then((response) => {
            movies = response.results;
            });
        });

        beforeEach(() => {
            cy.visit("/movies/trending/week");
        });

        it("displays the page header", () => {
            cy.get("h3").contains("Trending This Week");
        });

        it("displays the 'Filter Movies' card and all relevant filter/sort fields", () => {
            cy.get(".MuiGrid-root.MuiGrid-container")
            .eq(1)
            .find(".MuiGrid-root.MuiGrid-item")
            .eq(0)
            .within(() => {
                cy.get("h1").contains("Filter Movies");
                //Check if Input and Select fields are as expected
                cy.get("#filled-search").should('have.class',
                    "MuiInputBase-input MuiFilledInput-input MuiInputBase-inputTypeSearch");
                cy.get("#time-select").should('have.class', "MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input")
                //Check if Trending is set to this week
                .contains("This Week");
                cy.get("#genre-select").should('have.class',
                    "MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedEnd MuiAutocomplete-input MuiAutocomplete-inputFocused");
                cy.get("#sort-select").should('have.class', "MuiSelect-select MuiSelect-outlined MuiInputBase-input MuiOutlinedInput-input")
                //Check if Movies are sorted by popularity by default
                .contains("Popularity");
            });
        });

        it("displays the correct movie information and sorts movies by popularity", () => {
            //Sort movies by popularity
            var sorted_movies = movies.sort((m1, m2) => (
                (m1.popularity < m2.popularity) ? 1 : (m1.popularity > m2.popularity) ? -1 : 0
              ));

            //Confirm title is correct
            cy.get(".MuiCardHeader-content").each(($card, index) => {
                //Necessary to prevent errors when API returns double spacing.
                var title = sorted_movies[index].title.replace( /\s\s+/g, ' ' );
                cy.wrap($card).find("p").contains(title);
            });

            //Confirm Poster is correct
            cy.get(".MuiCardMedia-root").each(($card, index) => {
                var poster = "https://image.tmdb.org/t/p/w500/" + sorted_movies[index].poster_path;
                cy.wrap($card).should('have.attr', 'style', 'background-image: url("' + poster + '");');
            });

            //Confirm Release Date and Rating are correct
            cy.get(".MuiCardContent-root").each(($card, index) => {
                var release = sorted_movies[index].release_date;
                var rating = sorted_movies[index].vote_average;
                cy.wrap($card).should('contain', release).and('contain', rating);
            });

            //Confirm Favourites Button and More Info button are rendered
            cy.get(".MuiCardActions-root").each(($card, index) => {
                cy.wrap($card).find('button').should('have.attr', 'aria-label', 'add to favorites');
                cy.wrap($card).find('a').should('have.attr', 'href', '/movies/' + sorted_movies[index].id)
                    .and('contain', 'More Info ...');
            });
        });
    });
});